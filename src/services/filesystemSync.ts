import * as fs from 'fs/promises';
import * as path from 'path';
import chokidar from 'chokidar';
import Store from 'electron-store';
import { Note, Folder } from '../types/note';
import { generateFilename, extractTitle } from '../utils/noteUtils';

export interface SyncStatus {
  status: 'synced' | 'syncing' | 'error' | 'disabled';
  message?: string;
  lastSync?: Date;
}

interface StoreSchema {
  syncDirectory: string | null;
  syncEnabled: boolean;
}

export class FilesystemSync {
  private syncDirectory: string | null = null;
  private watcher: any | null = null; // chokidar.FSWatcher
  private isEnabled: boolean = false;
  private onChangeCallback?: (type: 'note' | 'folder', action: 'add' | 'change' | 'unlink', filePath: string) => void;
  private store: Store<StoreSchema>;

  constructor() {
    // Initialize electron-store for persistent settings
    this.store = new Store<StoreSchema>({
      defaults: {
        syncDirectory: null,
        syncEnabled: false
      }
    });

    // Load saved settings
    this.syncDirectory = (this.store as any).get('syncDirectory');
    this.isEnabled = (this.store as any).get('syncEnabled');

    console.log('[FILESYSTEM-SYNC] Loaded from store - directory:', this.syncDirectory, 'enabled:', this.isEnabled);
  }

  /**
   * Set the sync directory and optionally enable syncing
   */
  async setSyncDirectory(directory: string, enable: boolean = true): Promise<void> {
    console.log('[FILESYSTEM-SYNC] setSyncDirectory:', directory, 'enable:', enable);
    this.syncDirectory = directory;
    this.isEnabled = enable;

    // Persist to electron-store
    (this.store as any).set('syncDirectory', directory);
    (this.store as any).set('syncEnabled', enable);
    console.log('[FILESYSTEM-SYNC] Settings saved to store');

    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });
    console.log('[FILESYSTEM-SYNC] Directory created/verified:', directory);

    // Don't create default folders - let the user create their own structure

    if (enable) {
      await this.startWatching();
    }

    console.log('[FILESYSTEM-SYNC] Sync enabled. Directory:', this.syncDirectory, 'Enabled:', this.isEnabled);
  }

  /**
   * Get the current sync directory
   */
  getSyncDirectory(): string | null {
    return this.syncDirectory;
  }

  /**
   * Check if syncing is enabled
   */
  isSyncEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Clear/reset the sync directory
   */
  async clearSyncDirectory(): Promise<void> {
    console.log('[FILESYSTEM-SYNC] Clearing sync directory');

    // Stop watching if active
    if (this.watcher) {
      await this.stopWatching();
    }

    // Clear in-memory state
    this.syncDirectory = null;
    this.isEnabled = false;

    // Clear persisted settings
    this.store.set('syncDirectory', null);
    this.store.set('syncEnabled', false);

    console.log('[FILESYSTEM-SYNC] Sync directory cleared');
  }

  /**
   * Save a note to the filesystem
   */
  async saveNote(note: Note): Promise<void> {
    const title = extractTitle(note.content);
    console.log('[FILESYSTEM-SYNC] saveNote called:', note.id, title);
    console.log('[FILESYSTEM-SYNC] syncDirectory:', this.syncDirectory);
    console.log('[FILESYSTEM-SYNC] isEnabled:', this.isEnabled);

    if (!this.syncDirectory || !this.isEnabled) {
      throw new Error(`Sync is not enabled - syncDir: ${this.syncDirectory}, enabled: ${this.isEnabled}`);
    }

    // Determine folder path - if no folderId, save in root
    const folderPath = note.folderId || '';
    const notePath = folderPath ? path.join(this.syncDirectory, folderPath) : this.syncDirectory;

    console.log('[FILESYSTEM-SYNC] Note path:', notePath);

    // Ensure folder exists
    await fs.mkdir(notePath, { recursive: true });

    // Generate new filename using note ID and content-based title
    const titleSlug = generateFilename(note.content);
    const newFilename = `${note.id}-${titleSlug}.md`;
    const newFilePath = path.join(notePath, newFilename);

    // Check if file already exists with this exact name
    let existingFilePath: string | null = null;
    try {
      await fs.access(newFilePath);
      existingFilePath = newFilePath;
      console.log('[FILESYSTEM-SYNC] File exists, will update in place:', newFilePath);
    } catch {
      // File doesn't exist, check if there's an old file with different title
      try {
        const entries = await fs.readdir(notePath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() &&
              entry.name.startsWith(`${note.id}-`) &&
              entry.name.endsWith('.md')) {
            const oldFilePath = path.join(notePath, entry.name);
            console.log('[FILESYSTEM-SYNC] Found old file with different title, will rename:', oldFilePath);
            existingFilePath = oldFilePath;
            break;
          }
        }
      } catch (error) {
        console.error('[FILESYSTEM-SYNC] Error checking for old files:', error);
      }
    }

    // Format note content with frontmatter
    const content = this.formatNoteWithFrontmatter(note);

    if (existingFilePath && existingFilePath !== newFilePath) {
      // Title changed - rename the file
      console.log('[FILESYSTEM-SYNC] Renaming file from', existingFilePath, 'to', newFilePath);
      await fs.writeFile(newFilePath, content, 'utf-8');
      await fs.unlink(existingFilePath);
    } else {
      // Update existing file or create new one
      console.log('[FILESYSTEM-SYNC] Writing to file:', newFilePath);
      await fs.writeFile(newFilePath, content, 'utf-8');
    }
  }

  /**
   * Load all notes from the filesystem
   */
  async loadNotes(): Promise<Note[]> {
    if (!this.syncDirectory) {
      return [];
    }

    const notes: Note[] = [];

    try {
      await this.scanDirectory(this.syncDirectory, notes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }

    return notes;
  }

  /**
   * Recursively scan directory for markdown files
   */
  private async scanDirectory(dir: string, notes: Note[], parentFolder?: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        // Recursively scan subdirectory
        const folderName = parentFolder ? `${parentFolder}/${entry.name}` : entry.name;
        await this.scanDirectory(fullPath, notes, folderName);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Read and parse markdown file
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const note = await this.parseNoteFromContent(content, fullPath);

          // Set folder ID based on directory structure
          if (parentFolder) {
            note.folderId = parentFolder.split('/')[0]; // Use top-level folder as folderId
          }

          notes.push(note);
        } catch (error) {
          console.error(`Error reading file ${fullPath}:`, error);
        }
      }
    }
  }

  /**
   * Delete a note from the filesystem
   */
  async deleteNote(noteId: string, note?: Note): Promise<void> {
    if (!this.syncDirectory || !this.isEnabled) {
      throw new Error('Sync is not enabled');
    }

    // Determine the directory to search in
    const folderPath = note?.folderId || '';
    const notePath = folderPath ? path.join(this.syncDirectory, folderPath) : this.syncDirectory;

    try {
      // Find the file by scanning the directory for files with matching ID prefix
      // This handles cases where the title changed but filename still has old title
      const entries = await fs.readdir(notePath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.startsWith(`${noteId}-`) && entry.name.endsWith('.md')) {
          const filePath = path.join(notePath, entry.name);
          console.log('[FILESYSTEM-SYNC] Deleting file:', filePath);
          await fs.unlink(filePath);
          return;
        }
      }

      console.warn('[FILESYSTEM-SYNC] Note file not found:', noteId);
    } catch (error) {
      // Ignore "file not found" errors - file may have been deleted externally
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        console.error(`Error deleting note ${noteId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Delete a folder and all its contents from the filesystem
   */
  async deleteFolder(folderId: string): Promise<void> {
    console.log('[FILESYSTEM-SYNC] deleteFolder called:', folderId);

    if (!this.syncDirectory || !this.isEnabled) {
      throw new Error('Sync is not enabled');
    }

    const folderPath = path.join(this.syncDirectory, folderId);
    console.log('[FILESYSTEM-SYNC] Deleting folder at:', folderPath);

    try {
      // Use fs.rm with recursive option to delete folder and all contents
      await fs.rm(folderPath, { recursive: true, force: true });
      console.log('[FILESYSTEM-SYNC] Folder deleted successfully:', folderPath);
    } catch (error) {
      console.error('[FILESYSTEM-SYNC] Error deleting folder:', folderPath, error);
      // Don't throw - folder might not exist
    }
  }

  /**
   * Save folders metadata
   */
  async saveFolders(folders: Folder[]): Promise<void> {
    console.log('[FILESYSTEM-SYNC] saveFolders called, count:', folders.length);
    console.log('[FILESYSTEM-SYNC] syncDirectory:', this.syncDirectory);
    console.log('[FILESYSTEM-SYNC] isEnabled:', this.isEnabled);

    if (!this.syncDirectory || !this.isEnabled) {
      throw new Error(`Sync is not enabled - syncDir: ${this.syncDirectory}, enabled: ${this.isEnabled}`);
    }

    const foldersPath = path.join(this.syncDirectory, '.folders.json');
    console.log('[FILESYSTEM-SYNC] Writing folders to:', foldersPath);
    const content = JSON.stringify(folders, null, 2);
    await fs.writeFile(foldersPath, content, 'utf-8');
    console.log('[FILESYSTEM-SYNC] Folders JSON written');

    // Create directories for each folder
    for (const folder of folders) {
      const folderPath = path.join(this.syncDirectory, folder.id);
      console.log('[FILESYSTEM-SYNC] Creating directory:', folderPath);
      await fs.mkdir(folderPath, { recursive: true });

      // Create .gitkeep file to ensure empty folders are tracked by Git
      const gitkeepPath = path.join(folderPath, '.gitkeep');
      try {
        // Only create if it doesn't exist (don't overwrite)
        await fs.access(gitkeepPath);
      } catch {
        // File doesn't exist, create it
        await fs.writeFile(gitkeepPath, '', 'utf-8');
        console.log('[FILESYSTEM-SYNC] Created .gitkeep in:', folderPath);
      }
    }
    console.log('[FILESYSTEM-SYNC] All folder directories created');
  }

  /**
   * Load folders metadata
   */
  async loadFolders(): Promise<Folder[]> {
    if (!this.syncDirectory) {
      return [];
    }

    const foldersPath = path.join(this.syncDirectory, '.folders.json');

    try {
      const content = await fs.readFile(foldersPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // If file doesn't exist, return empty array - no default folders
      return [];
    }
  }

  /**
   * Start watching for file changes
   */
  async startWatching(): Promise<void> {
    if (!this.syncDirectory || this.watcher) {
      return;
    }

    this.watcher = chokidar.watch(this.syncDirectory, {
      ignored: [
        // Ignore all dotfiles except .folders.json and .gitkeep
        (filePath: string) => {
          const fileName = path.basename(filePath);
          // Allow .folders.json (we want to watch this)
          if (fileName === '.folders.json') return false;
          // Ignore .gitkeep files (these are just for Git tracking)
          if (fileName === '.gitkeep') return true;
          // Ignore other dotfiles and dot directories
          if (fileName.startsWith('.')) return true;
          return false;
        }
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('unlink', filePath));
  }

  /**
   * Stop watching for file changes
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    // Update enabled state and persist
    this.isEnabled = false;
    (this.store as any).set('syncEnabled', false);
    console.log('[FILESYSTEM-SYNC] Sync disabled and saved to store');
  }

  /**
   * Set callback for file changes
   */
  onFileChange(callback: (type: 'note' | 'folder', action: 'add' | 'change' | 'unlink', filePath: string) => void): void {
    this.onChangeCallback = callback;
  }

  /**
   * Handle file change events
   */
  private handleFileChange(action: 'add' | 'change' | 'unlink', filePath: string): void {
    if (!this.onChangeCallback) return;

    if (filePath.endsWith('.md')) {
      this.onChangeCallback('note', action, filePath);
    } else if (filePath.endsWith('.folders.json')) {
      this.onChangeCallback('folder', action, filePath);
    }
  }

  /**
   * Format note with frontmatter
   */
  private formatNoteWithFrontmatter(note: Note): string {
    const frontmatter = [
      `---`,
      `id: ${note.id}`,
      `type: ${note.type}`,
      note.folderId ? `folderId: ${note.folderId}` : '',
      `created: ${note.createdAt.toISOString()}`,
      `updated: ${note.updatedAt.toISOString()}`,
      `---`,
      ''
    ].filter(Boolean).join('\n');

    // Note: title is derived from first line of content, no need to store separately
    return frontmatter + note.content;
  }

  /**
   * Parse note from markdown content
   */
  private async parseNoteFromContent(content: string, filePath: string): Promise<Note> {
    // Import gray-matter dynamically to handle ESM module
    const matter = await import('gray-matter').then(m => m.default);
    const parsed = matter(content);

    const noteContent = parsed.content.trim();

    // Note: title is derived from first line of content, not stored in frontmatter
    // The content should contain everything including the title line

    return {
      id: parsed.data.id || this.generateId(),
      content: noteContent,
      type: parsed.data.type || 'markdown',
      folderId: parsed.data.folderId,
      createdAt: parsed.data.created ? new Date(parsed.data.created) : new Date(),
      updatedAt: parsed.data.updated ? new Date(parsed.data.updated) : new Date(),
      isDirty: false,
      order: parsed.data.order || 0
    };
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100) || 'untitled';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Export singleton instance
export const filesystemSync = new FilesystemSync();