import { useState, useEffect, useCallback } from 'react';
import { Note, Folder } from '../types/note';

interface SyncState {
  enabled: boolean;
  directory: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  error?: string;
}

export const useSyncDirectory = () => {
  const [syncState, setSyncState] = useState<SyncState>({
    enabled: false,
    directory: null,
    status: 'idle'
  });

  // Load initial sync state
  useEffect(() => {
    loadSyncState();
  }, []);

  const loadSyncState = async () => {
    if (!window.electronAPI?.fs) return;

    try {
      const [directory, enabled] = await Promise.all([
        window.electronAPI.fs.getSyncDirectory(),
        window.electronAPI.fs.isSyncEnabled()
      ]);

      console.log('[HOOK] Loaded sync state - directory:', directory, 'enabled:', enabled);

      setSyncState({
        enabled: enabled || false,
        directory: directory || null,
        status: 'idle'
      });

      console.log('[HOOK] Set sync state - directory:', directory || null, 'enabled:', enabled || false);
    } catch (error) {
      console.error('Failed to load sync state:', error);
    }
  };

  const enableSync = useCallback(async (directory: string): Promise<boolean> => {
    if (!window.electronAPI?.fs) return false;

    setSyncState(prev => ({ ...prev, status: 'syncing' }));

    try {
      const result = await window.electronAPI.fs.setSyncDirectory(directory);

      if (result.success) {
        setSyncState({
          enabled: true,
          directory,
          status: 'success',
        });

        // Start watching for changes
        await window.electronAPI.fs.watchChanges();
        return true;
      } else {
        setSyncState(prev => ({
          ...prev,
          status: 'error',
          error: result.error
        }));
        return false;
      }
    } catch (error) {
      setSyncState(prev => ({
        ...prev,
        status: 'error',
        error: (error as Error).message
      }));
      return false;
    }
  }, []);

  const disableSync = useCallback(async (): Promise<void> => {
    if (!window.electronAPI?.fs) return;

    try {
      await window.electronAPI.fs.stopWatching();
      setSyncState(prev => ({
        ...prev,
        enabled: false,
        status: 'idle'
      }));
    } catch (error) {
      console.error('Failed to disable sync:', error);
    }
  }, []);

  const saveNote = useCallback(async (note: Note): Promise<boolean> => {
    if (!window.electronAPI?.fs) return false;

    console.log('[HOOK] Saving note:', note.id);
    try {
      const result = await window.electronAPI.fs.saveNote(note);
      console.log('[HOOK] Save note result:', result);
      return result.success;
    } catch (error) {
      console.error('[HOOK] Failed to save note:', error);
      return false;
    }
  }, []);

  const deleteNote = useCallback(async (noteId: string, note?: Note): Promise<boolean> => {
    if (!window.electronAPI?.fs) return false;

    console.log('[HOOK] Deleting note:', noteId);
    try {
      const result = await window.electronAPI.fs.deleteNote(noteId, note);
      return result.success;
    } catch (error) {
      console.error('[HOOK] Failed to delete note:', error);
      return false;
    }
  }, []);

  const saveFolders = useCallback(async (folders: Folder[]): Promise<boolean> => {
    if (!window.electronAPI?.fs) return false;

    console.log('[HOOK] Saving folders, count:', folders.length);
    try {
      const result = await window.electronAPI.fs.saveFolders(folders);
      console.log('[HOOK] Save folders result:', result);
      return result.success;
    } catch (error) {
      console.error('[HOOK] Failed to save folders:', error);
      return false;
    }
  }, []);

  const loadNotesFromDisk = useCallback(async (): Promise<Note[]> => {
    if (!window.electronAPI?.fs) return [];

    try {
      const result = await window.electronAPI.fs.loadNotes();
      if (result.success && result.notes) {
        return result.notes;
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
    return [];
  }, []);

  const loadFoldersFromDisk = useCallback(async (): Promise<Folder[]> => {
    if (!window.electronAPI?.fs) return [];

    try {
      const result = await window.electronAPI.fs.loadFolders();
      if (result.success && result.folders) {
        return result.folders;
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
    return [];
  }, []);

  const openSyncFolder = useCallback(async (): Promise<void> => {
    if (!window.electronAPI?.fs) return;
    await window.electronAPI.fs.openSyncFolder();
  }, []);

  return {
    syncState,
    enableSync,
    disableSync,
    saveNote,
    deleteNote,
    saveFolders,
    loadNotesFromDisk,
    loadFoldersFromDisk,
    openSyncFolder
  };
};