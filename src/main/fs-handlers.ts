import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { filesystemSync } from '../services/filesystemSync';
import { Note, Folder } from '../types/note';

/**
 * Register IPC handlers for filesystem operations
 */
export function registerFilesystemHandlers(): void {
  // Initialize file watcher if sync was previously enabled
  const syncDir = filesystemSync.getSyncDirectory();
  const syncEnabled = filesystemSync.isSyncEnabled();

  if (syncDir && syncEnabled) {
    console.log('[FS-HANDLER] Auto-starting file watcher for:', syncDir);
    filesystemSync.startWatching().catch((error) => {
      console.error('[FS-HANDLER] Failed to auto-start file watcher:', error);
    });
  }
  // Set sync directory
  ipcMain.handle('fs:setSyncDirectory', async (_event, directoryPath: string) => {
    console.log('[FS-HANDLER] Setting sync directory to:', directoryPath);
    try {
      await filesystemSync.setSyncDirectory(directoryPath, true);
      console.log('[FS-HANDLER] Sync directory set successfully');

      // Notify all windows to reload
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('fs:syncDirectoryChanged', { directory: directoryPath });
        }
      });

      return { success: true, path: directoryPath };
    } catch (error) {
      console.error('[FS-HANDLER] Error setting sync directory:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get current sync directory
  ipcMain.handle('fs:getSyncDirectory', async () => {
    return filesystemSync.getSyncDirectory();
  });

  // Select directory using native dialog
  ipcMain.handle('fs:selectDirectory', async (event) => {
    // Don't attach to the panel window - this centers it on screen
    const result = await dialog.showOpenDialog({
      title: 'Select Sync Directory for ZenSide Notes',
      defaultPath: path.join(os.homedir(), 'Documents', 'ZenSide'),
      properties: ['openDirectory', 'createDirectory', 'treatPackageAsDirectory'],
      buttonLabel: 'Select Folder',
      message: 'Choose a folder where your notes will be saved as markdown files'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }

    return null;
  });

  // Save a note
  ipcMain.handle('fs:saveNote', async (event, note: Note) => {
    console.log('[FS-HANDLER] Saving note:', note.id);
    try {
      await filesystemSync.saveNote(note);
      console.log('[FS-HANDLER] Note saved successfully');

      // Notify all windows about file change for git status update
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('fs:fileChanged', { type: 'note', action: 'change' });
      });

      return { success: true };
    } catch (error) {
      console.error('[FS-HANDLER] Error saving note:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Load all notes
  ipcMain.handle('fs:loadNotes', async () => {
    try {
      const notes = await filesystemSync.loadNotes();
      return { success: true, notes };
    } catch (error) {
      console.error('Error loading notes:', error);
      return { success: false, error: (error as Error).message, notes: [] };
    }
  });

  // Delete a note
  ipcMain.handle('fs:deleteNote', async (event, noteId: string, note?: Note) => {
    try {
      await filesystemSync.deleteNote(noteId, note);

      // Notify all windows about file change for git status update
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('fs:fileChanged', { type: 'note', action: 'unlink' });
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting note:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Delete a folder
  ipcMain.handle('fs:deleteFolder', async (event, folderId: string) => {
    console.log('[FS-HANDLER] Deleting folder:', folderId);
    try {
      await filesystemSync.deleteFolder(folderId);
      console.log('[FS-HANDLER] Folder deleted successfully');

      // Notify all windows about file change for git status update
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('fs:fileChanged', { type: 'folder', action: 'unlink' });
      });

      return { success: true };
    } catch (error) {
      console.error('[FS-HANDLER] Error deleting folder:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Save folders
  ipcMain.handle('fs:saveFolders', async (event, folders: Folder[]) => {
    console.log('[FS-HANDLER] Saving folders, count:', folders.length);
    console.log('[FS-HANDLER] Folders:', folders);
    try {
      await filesystemSync.saveFolders(folders);
      console.log('[FS-HANDLER] Folders saved successfully');

      // Notify all windows about file change for git status update
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('fs:fileChanged', { type: 'folder', action: 'change' });
      });

      return { success: true };
    } catch (error) {
      console.error('[FS-HANDLER] Error saving folders:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Load folders
  ipcMain.handle('fs:loadFolders', async () => {
    try {
      const folders = await filesystemSync.loadFolders();
      return { success: true, folders };
    } catch (error) {
      console.error('Error loading folders:', error);
      return { success: false, error: (error as Error).message, folders: [] };
    }
  });

  // Start watching for changes
  ipcMain.handle('fs:watchChanges', async (event) => {
    try {
      await filesystemSync.startWatching();

      // Set up change callback to send events to renderer
      filesystemSync.onFileChange((type, action, filePath) => {
        event.sender.send('fs:fileChanged', { type, action, filePath });
      });

      return { success: true };
    } catch (error) {
      console.error('Error starting file watcher:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Stop watching for changes
  ipcMain.handle('fs:stopWatching', async () => {
    try {
      await filesystemSync.stopWatching();
      return { success: true };
    } catch (error) {
      console.error('Error stopping file watcher:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Open sync folder in file explorer
  ipcMain.handle('fs:openSyncFolder', async () => {
    const syncDir = filesystemSync.getSyncDirectory();
    if (syncDir) {
      shell.openPath(syncDir);
      return { success: true };
    }
    return { success: false, error: 'No sync directory set' };
  });

  // Check if sync is enabled
  ipcMain.handle('fs:isSyncEnabled', async () => {
    return filesystemSync.isSyncEnabled();
  });

  // Clear sync directory
  ipcMain.handle('fs:clearSyncDirectory', async () => {
    try {
      await filesystemSync.clearSyncDirectory();

      // Notify all windows to reload
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('fs:syncDirectoryCleared');
        }
      });

      return { success: true };
    } catch (error) {
      console.error('[FS-HANDLER] Error clearing sync directory:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get default sync directory path
  ipcMain.handle('fs:getDefaultSyncPath', async () => {
    return path.join(os.homedir(), 'Documents', 'ZenSide');
  });
}