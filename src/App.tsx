import React, { useState, useEffect, useRef } from 'react';
import { Note, Folder } from './types/note';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import { Settings } from './components/Settings';
import { GitMenu } from './components/git/GitMenu';
import { GitCommitDialog } from './components/git/GitCommitDialog';
import { GitHistoryDialog } from './components/git/GitHistoryDialog';
import { useSyncDirectory } from './hooks/useSyncDirectory';
import { FinanceView } from './components/finance/FinanceView';
import { Search } from './components/Search';
import { SearchResults } from './components/SearchResults';
import { useSearch } from './hooks/useSearch';
import { extractTitle } from './utils/noteUtils';
import { FiSearch, FiSettings, FiPlus, FiFolder, FiFileText } from 'react-icons/fi';
import './styles.css';
import './styles/finance.css';

type ViewMode = 'folders' | 'notes' | 'editor' | 'search';
type AppMode = 'notes' | 'finance';

const App: React.FC = () => {
  // Check if this is the settings window
  const isSettingsWindow = window.location.hash === '#settings';

  // If this is settings window, just render settings
  if (isSettingsWindow) {
    return <Settings isOpen={true} onClose={() => window.close()} />;
  }

  // App mode state (ZenNote vs ZenCash)
  const [appMode, setAppMode] = useState<AppMode>(() => {
    return (localStorage.getItem('appMode') as AppMode) || 'notes';
  });

  // Animation state
  const [animationClass, setAnimationClass] = useState<string>('');

  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null); // For visual highlight only
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const [folderPath, setFolderPath] = useState<Folder[]>([]); // Track folder navigation path
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [showGitCommit, setShowGitCommit] = useState(false);
  const [showGitHistory, setShowGitHistory] = useState(false);
  const [gitRefreshTrigger, setGitRefreshTrigger] = useState(0);

  // Refs for scrollable containers
  const folderListRef = useRef<HTMLDivElement>(null);
  const folderScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filesystem sync hook
  const {
    syncState,
    saveNote: saveNoteToFS,
    deleteNote: deleteNoteFromFS,
    saveFolders: saveFoldersToFS,
    loadNotesFromDisk,
    loadFoldersFromDisk
  } = useSyncDirectory();

  // Search hook
  const search = useSearch(notes, folders);

  useEffect(() => {
    // ONLY load from filesystem, no localStorage!
    console.log('[APP] useEffect triggered - syncState:', syncState);
    if (syncState.enabled && syncState.directory) {
      console.log('[APP] Loading notes from filesystem...');
      // Load notes from filesystem
      loadNotesFromDisk().then((diskNotes) => {
        console.log('[APP] Loaded notes from disk:', diskNotes.length);
        const parsedNotes = diskNotes.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
        }));

        // Migration: Assign order to notes that don't have it
        // Sort by createdAt descending (newest first), then assign order
        const sortedNotes = [...parsedNotes].sort((a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime()
        );

        let needsMigration = false;
        const migratedNotes = sortedNotes.map((note, index) => {
          if (note.order === undefined) {
            needsMigration = true;
            return { ...note, order: sortedNotes.length - index };
          }
          return note;
        });

        setNotes(migratedNotes);

        // If we migrated any notes, save them back to disk
        if (needsMigration) {
          console.log('[APP] Migrating notes with order field...');
          migratedNotes.forEach(note => {
            if (note.order !== undefined) {
              saveNoteToFS(note);
            }
          });
        }
      });

      // Load folders from filesystem
      loadFoldersFromDisk().then((diskFolders) => {
        console.log('[APP] Loaded folders from disk:', diskFolders.length);
        setFolders(diskFolders);
      });
    } else {
      // Clear notes and folders when sync is disabled or no directory is set
      console.log('[APP] No sync directory - clearing notes and folders');
      setNotes([]);
      setFolders([]);
      setSelectedNote(null);
      setSelectedFolder(null);
    }

    // Listen for notes loaded from filesystem sync
    const handleNotesLoaded = (event: CustomEvent) => {
      if (event.detail && event.detail.notes) {
        const parsedNotes = event.detail.notes.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
        }));

        // Migration: Assign order to notes that don't have it
        const sortedNotes = [...parsedNotes].sort((a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime()
        );

        const migratedNotes = sortedNotes.map((note, index) => {
          if (note.order === undefined) {
            return { ...note, order: sortedNotes.length - index };
          }
          return note;
        });

        setNotes(migratedNotes);
      }
    };

    window.addEventListener('sync:notesLoaded', handleNotesLoaded as EventListener);
    return () => {
      window.removeEventListener('sync:notesLoaded', handleNotesLoaded as EventListener);
    };
  }, [syncState.enabled, syncState.directory, loadNotesFromDisk, loadFoldersFromDisk, saveNoteToFS]);

  useEffect(() => {
    // Close action menu when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (showActionMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('.action-menu')) {
          setShowActionMenu(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showActionMenu]);

  // Listen for sync directory cleared event
  useEffect(() => {
    const handleSyncDirectoryCleared = () => {
      console.log('[APP] Sync directory cleared - reloading app');
      window.location.reload();
    };

    if (window.electronAPI?.onSyncDirectoryCleared) {
      window.electronAPI.onSyncDirectoryCleared(handleSyncDirectoryCleared);
    }
  }, []);

  // Listen for sync directory changed event
  useEffect(() => {
    const handleSyncDirectoryChanged = (data: { directory: string }) => {
      console.log('[APP] Sync directory changed to:', data.directory, '- reloading app');
      window.location.reload();
    };

    if (window.electronAPI?.onSyncDirectoryChanged) {
      window.electronAPI.onSyncDirectoryChanged(handleSyncDirectoryChanged);
    }
  }, []);

  // Listen for search keyboard shortcut from main process
  useEffect(() => {
    const handleSearchShortcut = () => {
      handleSearchOpen();
    };

    // Listen for IPC event from main process
    if (window.electronAPI?.onOpenSearch) {
      window.electronAPI.onOpenSearch(handleSearchShortcut);
    }

    // Also listen for custom event (fallback)
    window.addEventListener('open-search', handleSearchShortcut);
    return () => window.removeEventListener('open-search', handleSearchShortcut);
  }, []);

  // Persist app mode to localStorage
  useEffect(() => {
    localStorage.setItem('appMode', appMode);
  }, [appMode]);

  // Handle scrollbar auto-hide for folder-list
  useEffect(() => {
    const folderList = folderListRef.current;
    if (!folderList) return;

    // Remove any existing scrolling class on mount
    folderList.classList.remove('scrolling');

    const handleScroll = () => {
      folderList.classList.add('scrolling');

      if (folderScrollTimeoutRef.current) {
        clearTimeout(folderScrollTimeoutRef.current);
      }

      folderScrollTimeoutRef.current = setTimeout(() => {
        folderList.classList.remove('scrolling');
      }, 3000);
    };

    folderList.addEventListener('scroll', handleScroll);

    return () => {
      folderList.removeEventListener('scroll', handleScroll);
      if (folderScrollTimeoutRef.current) {
        clearTimeout(folderScrollTimeoutRef.current);
      }
      // Clean up scrolling class on unmount
      folderList.classList.remove('scrolling');
    };
  }, [viewMode, appMode]); // Re-run when view or app mode changes

  // Handler to switch app mode with animation
  const switchAppMode = (mode: AppMode) => {
    if (mode === appMode) return; // Don't animate if clicking same tab

    // Determine animation direction
    const isMovingRight = (appMode === 'notes' && mode === 'finance');

    // Set exit animation
    setAnimationClass(isMovingRight ? 'swap-out-left' : 'swap-out-right');

    // After exit animation, switch mode and play enter animation
    setTimeout(() => {
      setAppMode(mode);
      setAnimationClass(isMovingRight ? 'swap-in-right' : 'swap-in-left');

      // Clear animation class after animation completes
      setTimeout(() => {
        setAnimationClass('');
      }, 300);
    }, 300);
  };

  // Removed localStorage functions - we only use filesystem now!

  // This function is no longer used - we save individual notes directly

  const saveFolders = async (updatedFolders: Folder[]) => {
    try {
      setFolders(updatedFolders);

      // Save to filesystem only (no localStorage!)
      console.log('[APP] Saving folders to filesystem:', updatedFolders.length);
      await saveFoldersToFS(updatedFolders);
    } catch (error) {
      console.error('Failed to save folders:', error);
    }
  };

  const handleCreateFolder = () => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: '',  // Start with empty name
      color: '#00d4ff',
      parentId: selectedFolder?.id,
    };

    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);

    // Don't save to filesystem yet - wait until user enters a name!

    setEditingFolderId(newFolder.id);
    setShowActionMenu(false);

    // Switch to folders view to show the new folder
    setViewMode('folders');
  };

  const handleFolderNameChange = (folderId: string, newName: string) => {
    const updatedFolders = folders.map(f =>
      f.id === folderId ? { ...f, name: newName } : f
    );
    setFolders(updatedFolders);
  };

  const handleFolderNameSubmit = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);

    if (folder && folder.name.trim()) {
      // Save folders to both localStorage and filesystem
      await saveFolders(folders);
      setEditingFolderId(null);
    } else {
      // Empty name - only remove if it's a new folder
      if (folderId.startsWith('folder-')) {
        const updatedFolders = folders.filter(f => f.id !== folderId);
        setFolders(updatedFolders);
      }
      setEditingFolderId(null);
    }
  };

  const handleCancelFolderEdit = (folderId: string) => {
    // If it's a new folder (temp ID), remove it
    if (folderId.startsWith('temp-')) {
      const updatedFolders = folders.filter(f => f.id !== folderId);
      setFolders(updatedFolders);
    }
    // If it's an existing folder, just cancel editing
    setEditingFolderId(null);
  };

  const handleFolderNameClick = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolderId(folderId);
  };

  const handleCreateNote = async () => {
    // Find the highest order number in current folder (or all notes if no folder)
    const notesInFolder = notes.filter(n => n.folderId === selectedFolder?.id);
    const maxOrder = notesInFolder.length > 0
      ? Math.max(...notesInFolder.map(n => n.order || 0))
      : 0;

    const newNote: Note = {
      id: Date.now().toString(),
      content: '', // Empty content - user will type
      type: 'plaintext',
      folderId: selectedFolder?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDirty: false,
      order: maxOrder + 1, // Always higher than existing notes
    };

    const updatedNotes = [newNote, ...notes]; // Add to beginning
    setNotes(updatedNotes);

    // Save to filesystem only (no localStorage!)
    console.log('[APP] syncState:', syncState);
    console.log('[APP] Creating new note:', newNote.id);

    // Always save to filesystem if function exists
    await saveNoteToFS(newNote);

    setSelectedNote(newNote);

    // If we're at the root level (no selected folder), stay in folders view
    // If current folder has subfolders, stay in folders view (notes will show below)
    // Otherwise, switch to notes view
    if (!selectedFolder) {
      setViewMode('folders'); // Stay in folders view at root level
    } else {
      const hasSubfolders = folders.some(f => f.parentId === selectedFolder.id);
      if (!hasSubfolders) {
        setViewMode('notes');
      }
    }

    setShowActionMenu(false);
  };

  const createNewNote = () => {
    handleCreateNote();
  };

  const handleFolderClick = (folder: Folder) => {
    setSelectedFolder(folder);
    setFolderPath([...folderPath, folder]); // Add to path

    // Check if this folder has subfolders or notes
    const hasSubfolders = folders.some(f => f.parentId === folder.id);
    const hasNotes = notes.some(n => n.folderId === folder.id);

    if (hasSubfolders || !hasNotes) {
      setViewMode('folders'); // Show subfolders
    } else {
      setViewMode('notes'); // Show notes
    }
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setViewMode('editor');
  };

  const handleNoteHighlight = (noteId: string | null) => {
    setHighlightedNoteId(noteId);
  };

  const handleBack = () => {
    setHighlightedNoteId(null); // Clear highlight when navigating back
    if (viewMode === 'editor') {
      setSelectedNote(null);
      // Go back to notes if in a folder, otherwise to folders
      const hasNotes = selectedFolder && notes.some(n => n.folderId === selectedFolder.id);
      setViewMode(hasNotes ? 'notes' : 'folders');
    } else if (viewMode === 'notes') {
      // Go back to parent folder's subfolder view
      const newPath = [...folderPath];
      newPath.pop(); // Remove current folder
      setFolderPath(newPath);
      setSelectedFolder(newPath[newPath.length - 1] || null);
      setViewMode('folders');
    } else if (viewMode === 'folders' && folderPath.length > 0) {
      // Go back one level in folder hierarchy
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      setSelectedFolder(newPath[newPath.length - 1] || null);
    }
  };

  const getCurrentFolders = () => {
    const currentParentId = selectedFolder?.id || undefined;
    return folders.filter(f => f.parentId === currentParentId);
  };

  const getNotesInFolder = (folderId?: string) => {
    return notes
      .filter(note => note.folderId === folderId)
      .sort((a, b) => (b.order || 0) - (a.order || 0)); // Higher order first (newest at top)
  };

  const updateNote = async (updatedNote: Note) => {
    const updatedNotes = notes.map((note) =>
      note.id === updatedNote.id ? updatedNote : note
    );

    setNotes(updatedNotes);

    // Save to filesystem only (no localStorage!)
    console.log('[APP] Updating note:', updatedNote.id);

    // Always save to filesystem if function exists
    await saveNoteToFS(updatedNote);

    setSelectedNote(updatedNote);
  };

  const deleteNote = async (noteId: string) => {
    const noteToDelete = notes.find(n => n.id === noteId);
    const updatedNotes = notes.filter((note) => note.id !== noteId);

    setNotes(updatedNotes);

    // Delete from filesystem only (no localStorage!)
    if (noteToDelete) {
      console.log('[APP] Deleting note:', noteId);
      await deleteNoteFromFS(noteId, noteToDelete);
    }

    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }

    // Clear highlight if deleted note was highlighted
    if (highlightedNoteId === noteId) {
      setHighlightedNoteId(null);
    }
  };

  const handleSearchOpen = () => {
    if (appMode === 'notes') {
      // Toggle search: if already in search mode, close it
      if (viewMode === 'search') {
        handleSearchClose();
      } else {
        search.openSearch();
        setViewMode('search');
      }
    }
  };

  const handleSearchClose = () => {
    search.closeSearch();
    // Return to appropriate view
    if (selectedNote) {
      setViewMode('editor');
    } else if (selectedFolder && getNotesInFolder(selectedFolder.id).length > 0) {
      setViewMode('notes');
    } else {
      setViewMode('folders');
    }
  };

  const handleSearchNoteClick = (note: Note) => {
    // Update folder path and selectedFolder if note is in a folder
    if (note.folderId) {
      const folder = folders.find(f => f.id === note.folderId);
      if (folder) {
        // Build folder path from root to this folder
        const path: Folder[] = [];
        let currentFolder: Folder | undefined = folder;
        while (currentFolder) {
          path.unshift(currentFolder);
          currentFolder = folders.find(f => f.id === currentFolder!.parentId);
        }
        setFolderPath(path);
        setSelectedFolder(folder);
      }
    } else {
      // Note is in root
      setFolderPath([]);
      setSelectedFolder(null);
    }

    // Navigate to notes view FIRST (this changes the view immediately)
    setViewMode('notes');

    // Then close search (this clears search state)
    search.closeSearch();

    // Set highlighted note for visual feedback
    setHighlightedNoteId(note.id);

    // Scroll to note after a short delay to ensure DOM is ready
    setTimeout(() => {
      const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
      if (noteElement) {
        noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add bounce animation class
        noteElement.classList.add('note-highlight-bounce');
        // Remove animation class after animation completes
        setTimeout(() => {
          noteElement.classList.remove('note-highlight-bounce');
        }, 1000);
      }
    }, 150);
  };

  const deleteFolder = async (folderId: string) => {
    // Collect all folders to be deleted (including subfolders)
    const foldersToDelete = new Set([folderId]);
    const findSubfolders = (parentId: string) => {
      folders.forEach(f => {
        if (f.parentId === parentId) {
          foldersToDelete.add(f.id);
          findSubfolders(f.id);
        }
      });
    };
    findSubfolders(folderId);

    // Count notes in all folders to be deleted
    const notesInFoldersToDelete = notes.filter(n => foldersToDelete.has(n.folderId || ''));
    const subfoldersCount = foldersToDelete.size - 1; // Exclude the folder itself

    // Build confirmation message
    let confirmMessage = 'Delete this folder? This cannot be undone.';
    if (subfoldersCount > 0 || notesInFoldersToDelete.length > 0) {
      const items: string[] = [];
      if (subfoldersCount > 0) {
        items.push(`${subfoldersCount} subfolder${subfoldersCount > 1 ? 's' : ''}`);
      }
      if (notesInFoldersToDelete.length > 0) {
        items.push(`${notesInFoldersToDelete.length} note${notesInFoldersToDelete.length > 1 ? 's' : ''}`);
      }

      confirmMessage = `Delete this folder and ${items.join(' + ')}?\n\nThis will permanently delete all contents and cannot be undone.`;
    }

    const confirmed = confirm(confirmMessage);
    if (!confirmed) return;

    // Delete notes in all folders to be deleted
    const notesToDelete = notes.filter(n => foldersToDelete.has(n.folderId || ''));
    const updatedNotes = notes.filter(n => !foldersToDelete.has(n.folderId || ''));
    setNotes(updatedNotes);

    // Delete from filesystem
    // Delete each note from filesystem
    for (const note of notesToDelete) {
      console.log('[APP] Deleting note from folder:', note.id);
      await deleteNoteFromFS(note.id, note);
    }

    // Delete folders
    const updatedFolders = folders.filter(f => !foldersToDelete.has(f.id));

    // Delete the physical folders from filesystem
    if (window.electronAPI?.fs) {
      for (const folderId of foldersToDelete) {
        console.log('[APP] Deleting folder from filesystem:', folderId);
        try {
          const result = await window.electronAPI.fs.deleteFolder(folderId);
          if (!result.success) {
            console.error('[APP] Failed to delete folder from filesystem:', result.error);
          }
        } catch (error) {
          console.error('[APP] Error deleting folder from filesystem:', error);
        }
      }
    }

    await saveFolders(updatedFolders);

    // If we're currently viewing the deleted folder, go back
    if (selectedFolder?.id === folderId) {
      handleBack();
    }
  };

  return (
    <div className="app">
      {/* App Mode Switcher */}
      <div className="app-mode-switcher">
        <button
          className={`mode-tab ${appMode === 'notes' ? 'active' : ''}`}
          onClick={() => switchAppMode('notes')}
        >
          ZenNote
        </button>
        <button
          className={`mode-tab ${appMode === 'finance' ? 'active' : ''}`}
          onClick={() => switchAppMode('finance')}
        >
          ZenCash
        </button>
      </div>

      <div className="app-content-wrapper">
        <div className={`app-mode-content ${animationClass}`}>
          {appMode === 'notes' ? (
            <>
              <div className="header">
            {(
              (viewMode === 'notes' && selectedFolder !== null) ||
              (viewMode === 'folders' && folderPath.length > 0) ||
              viewMode === 'editor'
            ) && (
              <button onClick={handleBack} className="btn-back">
                ←
              </button>
            )}
            <h2 className="header-title">
              {viewMode === 'search' ? 'Search' :
               viewMode === 'folders' && folderPath.length === 0 ? 'SideNotes' :
               viewMode === 'folders' && selectedFolder ? selectedFolder.name :
               viewMode === 'notes' ? (selectedFolder?.name || 'SideNotes') :
               selectedNote ? extractTitle(selectedNote.content) : 'Note'}
            </h2>
            <div className="header-actions">
              <button
                className="btn-icon"
                onClick={handleSearchOpen}
                title="Search (Cmd+F)"
              >
                <FiSearch size={18} />
              </button>
              <button
                className="btn-icon"
                onClick={() => window.electronAPI?.openSettings()}
                title="Settings"
              >
                <FiSettings size={18} />
              </button>
              {viewMode !== 'editor' && (
            <div className="action-menu">
              <button
                className="action-menu-trigger"
                onClick={() => {
                  if (!syncState.directory) {
                    window.electronAPI?.openSettings();
                  } else {
                    setShowActionMenu(!showActionMenu);
                  }
                }}
                title={!syncState.directory ? 'Choose sync directory first' : 'Create new'}
              >
                <FiPlus size={18} />
              </button>
              {showActionMenu && syncState.directory && (
                <div className="action-menu-dropdown">
                  <div
                    className="action-menu-item"
                    onClick={() => {
                      handleCreateFolder();
                    }}
                  >
                    <span className="action-menu-icon">
                      <FiFolder size={18} />
                    </span>
                    <span>New Folder</span>
                  </div>
                  <div
                    className="action-menu-item"
                    onClick={() => {
                      handleCreateNote();
                    }}
                  >
                    <span className="action-menu-icon">
                      <FiFileText size={18} />
                    </span>
                    <span>New Note</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {viewMode === 'editor' && (
            <button onClick={createNewNote} className="btn-icon">
              <FiPlus size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="content">
        {viewMode === 'search' ? (
          <>
            <Search
              query={search.query}
              onQueryChange={search.setQuery}
              onClose={handleSearchClose}
              searchHistory={search.searchHistory}
              isSearching={search.isSearching}
            />
            <SearchResults
              results={search.results}
              query={search.query}
              folders={folders}
              onSelectNote={handleSearchNoteClick}
              isSearching={search.isSearching}
            />
          </>
        ) : viewMode === 'folders' ? (
          <div
            ref={folderListRef}
            className="folder-list"
            onClick={(e) => {
              // Clear selection if clicking on background
              if (e.target === e.currentTarget) {
                setSelectedNote(null);
              }
            }}
          >
            {getCurrentFolders().length === 0 &&
             getNotesInFolder(selectedFolder?.id).length === 0 ? (
              <div className="empty-state">
                {!syncState.directory ? (
                  <>
                    <div className="empty-state-icon">📁</div>
                    <p className="empty-state-title">Choose Directory First</p>
                    <p className="empty-state-description">
                      Please select a sync directory in Settings to start creating notes
                    </p>
                    <button
                      onClick={() => window.electronAPI?.openSettings()}
                      className="btn-create-first"
                    >
                      Open Settings
                    </button>
                  </>
                ) : (
                  <>
                    <p>{folderPath.length > 0 ? 'This folder is empty' : 'No folders yet'}</p>
                    <button onClick={createNewNote} className="btn-create-first">
                      Create your first note
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                {getCurrentFolders().map((folder) => {
                  const countSubfolders = folders.filter(f => f.parentId === folder.id).length;
                  const countNotes = getNotesInFolder(folder.id).length;
                  const totalCount = countSubfolders + countNotes;
                  const isEditing = editingFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      className={`folder-item ${isEditing ? 'editing' : ''}`}
                      onClick={() => !isEditing && handleFolderClick(folder)}
                    >
                      <span className="folder-icon" style={{ color: folder.color }}>📁</span>
                      {isEditing ? (
                        <input
                          type="text"
                          className="folder-name-input"
                          value={folder.name}
                          onChange={(e) => handleFolderNameChange(folder.id, e.target.value)}
                          onBlur={() => handleFolderNameSubmit(folder.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleFolderNameSubmit(folder.id);
                            } else if (e.key === 'Escape') {
                              handleCancelFolderEdit(folder.id);
                            }
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <span
                            className="folder-name"
                            onClick={(e) => handleFolderNameClick(folder.id, e)}
                            title="Click to rename"
                          >
                            {folder.name}
                          </span>
                          <span className="folder-spacer"></span>
                          <div className="folder-actions">
                            <span className="folder-count">{totalCount}</span>
                            <button
                              className="btn-delete-folder"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFolder(folder.id);
                              }}
                              title="Delete folder"
                            >
                              ×
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Show notes in current folder if any */}
                {getNotesInFolder(selectedFolder?.id).length > 0 && (
                  <div className="notes-section">
                    <div className="section-divider">Notes</div>
                    <NoteList
                      notes={getNotesInFolder(selectedFolder?.id)}
                      folders={folders}
                      selectedNote={selectedNote}
                      highlightedNoteId={highlightedNoteId}
                      onSelectNote={handleNoteClick}
                      onHighlightNote={handleNoteHighlight}
                      onDeleteNote={deleteNote}
                      onUpdateNote={updateNote}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ) : viewMode === 'notes' ? (
          <NoteList
            notes={getNotesInFolder(selectedFolder?.id)}
            folders={folders}
            selectedNote={selectedNote}
            highlightedNoteId={highlightedNoteId}
            onSelectNote={handleNoteClick}
            onHighlightNote={handleNoteHighlight}
            onDeleteNote={deleteNote}
            onUpdateNote={updateNote}
          />
        ) : viewMode === 'editor' && selectedNote ? (
          <NoteEditor note={selectedNote} onUpdateNote={updateNote} />
        ) : null}

        {viewMode === 'notes' && getNotesInFolder(selectedFolder?.id).length === 0 && (
          <div className="empty-state">
            {!syncState.directory ? (
              <>
                <div className="empty-state-icon">📁</div>
                <p className="empty-state-title">Choose Directory First</p>
                <p className="empty-state-description">
                  Please select a sync directory in Settings to start creating notes
                </p>
                <button
                  onClick={() => window.electronAPI?.openSettings()}
                  className="btn-create-first"
                >
                  Open Settings
                </button>
              </>
            ) : (
              <>
                <p>No notes in this folder</p>
                <button onClick={createNewNote} className="btn-create-first">
                  Create your first note
                </button>
              </>
            )}
          </div>
        )}
      </div>
            </>
          ) : (
            /* Finance View */
            <FinanceView
              syncDirectory={syncState.directory}
              onOpenSettings={() => window.electronAPI?.openSettings()}
            />
          )}
        </div>
      </div>

      {/* Git Menu - positioned at bottom of app - always visible */}
      <GitMenu
        key={gitRefreshTrigger}
        syncDirectory={syncState.directory}
        onOpenHistory={() => setShowGitHistory(true)}
        onOpenCommit={() => setShowGitCommit(true)}
      />

      {/* Git Commit Dialog - always available */}
      {showGitCommit && (
        <GitCommitDialog
          syncDirectory={syncState.directory}
          onClose={() => setShowGitCommit(false)}
          onCommitSuccess={() => setGitRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* Git History Dialog - always available */}
      {showGitHistory && (
        <GitHistoryDialog
          syncDirectory={syncState.directory}
          onClose={() => setShowGitHistory(false)}
        />
      )}
    </div>
  );
};

export default App;
