import React, { useState, useRef, useEffect } from 'react';
import { useGit } from '../../hooks/useGit';
import { useAutoSync } from '../../hooks/useAutoSync';
import { GitStatusDialog } from './GitStatusDialog';
import { BiRefresh } from 'react-icons/bi';
import './git-menu.css';

interface GitMenuProps {
  syncDirectory: string | null;
  onOpenHistory: () => void;
  onOpenCommit: () => void;
}

export const GitMenu: React.FC<GitMenuProps> = ({
  syncDirectory,
  onOpenHistory,
  onOpenCommit,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [hasCommits, setHasCommits] = useState(false);
  const [hasRemoteBranch, setHasRemoteBranch] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const git = useGit(syncDirectory);

  // Auto-sync functionality
  const autoSync = useAutoSync(
    syncDirectory,
    git.isRepository,
    git.remotes.length > 0,
    hasCommits
  );

  // Listen for file changes and refresh git status
  useEffect(() => {
    if (!git.isRepository) {
      return;
    }

    // Initial refresh
    git.refreshStatus();

    // Listen for filesystem changes
    const handleFileChange = () => {
      console.log('[GitMenu] File changed, refreshing git status');
      git.refreshStatus();
    };

    // Listen for auto-sync completion
    const handleSyncCompleted = () => {
      console.log('[GitMenu] Auto-sync completed, refreshing git status');
      git.refreshStatus();
    };

    window.electronAPI?.onFileChanged(handleFileChange);
    window.addEventListener('git:sync-completed', handleSyncCompleted);

    return () => {
      window.removeEventListener('git:sync-completed', handleSyncCompleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [git.isRepository]);

  // Check if repository has any commits
  useEffect(() => {
    const checkCommits = async () => {
      if (git.isRepository) {
        try {
          const log = await git.getLog(1);
          setHasCommits(log.total > 0);
        } catch (error) {
          // No commits yet or error getting log
          console.log('[GitMenu] No commits yet or error:', error);
          setHasCommits(false);
        }
      } else {
        setHasCommits(false);
      }
    };
    checkCommits();
  }, [git.isRepository, git.status]);

  // Check if the current branch exists on remote
  useEffect(() => {
    const checkRemoteBranch = async () => {
      if (!git.isRepository || !hasCommits) {
        setHasRemoteBranch(false);
        return;
      }

      try {
        // Check if tracking branch exists
        const hasTracking = !!git.status?.tracking;
        setHasRemoteBranch(hasTracking);
      } catch (error) {
        console.log('[GitMenu] Error checking remote branch:', error);
        setHasRemoteBranch(false);
      }
    };
    checkRemoteBranch();
  }, [git.isRepository, git.status, hasCommits]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Hide toast after delay (longer for errors)
  useEffect(() => {
    if (showToast) {
      const delay = showToast.type === 'error' ? 6000 : 3000;
      const timer = setTimeout(() => {
        setShowToast(null);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Don't show menu if sync directory is not set, git is not installed, or not a repository
  // Users should set up Git through the Settings panel
  if (!syncDirectory || !git.isGitInstalled || !git.isRepository) {
    return null;
  }

  const handlePush = async () => {
    const isPublishing = !hasRemoteBranch;

    try {
      setIsOpen(false);
      setShowToast({ message: isPublishing ? 'Publishing branch...' : 'Pushing...', type: 'info' });

      await git.push();

      if (isPublishing) {
        // Update remote branch status after publishing
        setHasRemoteBranch(true);

        // Auto-enable auto-sync after successful first publish
        console.log('[GitMenu] First publish successful - enabling auto-sync');
        localStorage.setItem('git-auto-sync-enabled', 'true');

        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('git:auto-sync-changed', {
          detail: { enabled: true, interval: parseInt(localStorage.getItem('git-auto-sync-interval') || '60', 10) }
        }));

        setShowToast({ message: 'Branch published! Auto-sync enabled', type: 'success' });
      } else {
        setShowToast({ message: 'Pushed successfully', type: 'success' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Push failed';
      setShowToast({ message: errorMessage, type: 'error' });
    }
  };

  const handlePull = async () => {
    setIsOpen(false);

    try {
      setShowToast({ message: 'Pulling changes...', type: 'info' });

      const statusBefore = git.status;
      await git.pull();

      // Check if there were actually changes to pull
      const statusAfter = await window.electronAPI?.git.status();
      const hadChanges = statusBefore?.behind !== 0;

      if (hadChanges && statusAfter?.behind === 0) {
        // Successfully pulled changes
        setShowToast({ message: 'Pulled successfully! Reloading...', type: 'success' });
        // Give time for toast to show before reload
        setTimeout(() => window.location.reload(), 1000);
      } else {
        // Already up to date
        setShowToast({ message: 'Already up to date', type: 'info' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Pull failed';
      setShowToast({ message: errorMessage, type: 'error' });
    }
  };

  // Filter function to exclude auto-sync generated files
  const isAutoSyncFile = (path: string) => {
    // Auto-sync files are timestamp-based like: 1762323118666-new-note.md
    // They can also be in folders like: folder-1762232030505/1762319704626-new-note.md
    const fileName = path.split('/').pop() || '';
    const folderPath = path.split('/').slice(0, -1).join('/');

    // Check if filename starts with timestamp pattern (13 digits)
    const isTimestampFile = /^\d{13}-/.test(fileName);

    // Check if folder name starts with "folder-" followed by timestamp
    const isInTimestampFolder = /folder-\d{13}/.test(folderPath);

    return isTimestampFile || isInTimestampFolder;
  };

  // Calculate uncommitted count, excluding auto-sync files when auto-sync is enabled
  const allUncommittedFiles = git.status?.files || [];
  const shouldHideAutoSyncFiles = localStorage.getItem('git-auto-sync-hide-files') !== 'false'; // Default to true
  const filteredFiles = autoSync.isAutoSyncEnabled && shouldHideAutoSyncFiles
    ? allUncommittedFiles.filter(f => !isAutoSyncFile(f.path))
    : allUncommittedFiles;
  const uncommittedCount = filteredFiles.length;
  const totalUncommittedCount = allUncommittedFiles.length; // Total including auto-sync files
  const hasUnpushedCommits = (git.status?.ahead || 0) > 0;

  // Determine status indicator
  let statusIcon: React.ReactNode = '✓';
  let statusClass = 'synced';
  let statusText = 'Synced';

  if (git.error) {
    statusIcon = '⚠';
    statusClass = 'error';
    statusText = 'Error';
  } else if (!hasCommits) {
    // No commits yet - repository just initialized
    statusIcon = '○';
    statusClass = 'no-commits';
    statusText = 'No commits';
  } else if (!hasRemoteBranch) {
    // Has commits but not published to remote yet
    statusIcon = '📤';
    statusClass = 'unpublished';
    statusText = 'Not published';
  } else if (autoSync.isSyncing) {
    statusIcon = <BiRefresh />;
    statusClass = 'syncing';
    statusText = 'Syncing...';
  } else if (totalUncommittedCount > 0) {
    // Show changes status if there are ANY uncommitted files (including auto-sync)
    // But only show badge count for non-auto-sync files
    statusIcon = '●';
    statusClass = 'changes';
    statusText = 'Changes';
  } else if (hasUnpushedCommits) {
    statusIcon = '⬆';
    statusClass = 'unpushed';
    statusText = 'Unpushed';
  }

  // Handle sync now button
  const handleSyncNow = async () => {
    setIsOpen(false);
    try {
      setShowToast({ message: 'Syncing...', type: 'info' });
      await autoSync.syncNow();
      setShowToast({ message: 'Synced successfully!', type: 'success' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setShowToast({ message: errorMessage, type: 'error' });
    }
  };

  return (
    <>
      <div className="git-menu-container" ref={menuRef}>
        <button
          className={`git-menu-button ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          title="Git Operations"
        >
          <span className="git-icon">🌿</span>
          <div className="git-info">
            <span className="git-branch">{git.currentBranch}</span>
            <span className={`git-status ${statusClass}`}>
              <span className={`status-icon ${autoSync.isSyncing ? 'rotating' : ''}`}>{statusIcon}</span>
              <span className="status-text">{statusText}</span>
            </span>
          </div>
          {uncommittedCount > 0 && (
            <span className="git-badge">{uncommittedCount}</span>
          )}
        </button>

        {isOpen && (
          <div className="git-dropdown">
            {!hasCommits && uncommittedCount > 0 && (
              <div className="git-dropdown-message">
                💡 Create your first commit to start tracking changes
              </div>
            )}

            {/* Only show status button if there are changes to display */}
            {(uncommittedCount > 0 || !shouldHideAutoSyncFiles || !autoSync.isAutoSyncEnabled) && (
              <button
                className="git-dropdown-item"
                onClick={async () => {
                  setIsOpen(false);
                  // Refresh status before showing dialog
                  await git.refreshStatus();
                  setShowStatus(true);
                }}
              >
                <span className="item-icon">📊</span>
                <span>Status</span>
                {uncommittedCount > 0 && (
                  <span className="item-badge">{uncommittedCount}</span>
                )}
              </button>
            )}

            <div className="git-dropdown-divider" />

            {autoSync.isAutoSyncEnabled ? (
              // Auto-sync enabled - show Sync Now button
              <>
                <button
                  className="git-dropdown-item sync-now"
                  onClick={handleSyncNow}
                  disabled={autoSync.isSyncing || !hasCommits}
                  title={!hasCommits ? 'Create a commit first' : 'Sync changes now'}
                >
                  <span className={`item-icon ${autoSync.isSyncing ? 'rotating' : ''}`}>
                    <BiRefresh />
                  </span>
                  <span>{autoSync.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>

                {autoSync.lastSyncTime && (
                  <div className="git-dropdown-info">
                    Last synced: {new Date(autoSync.lastSyncTime).toLocaleTimeString()}
                  </div>
                )}

                {autoSync.syncError && (
                  <div className="git-dropdown-error">
                    ⚠️ {autoSync.syncError}
                  </div>
                )}
              </>
            ) : (
              // Manual mode - show individual push/pull buttons
              <>
                <button
                  className="git-dropdown-item"
                  onClick={handlePush}
                  disabled={git.isLoading || !hasCommits || (hasRemoteBranch && !hasUnpushedCommits)}
                  title={
                    !hasCommits
                      ? 'Create a commit first'
                      : hasRemoteBranch && !hasUnpushedCommits
                        ? 'No commits to push'
                        : !hasRemoteBranch
                          ? 'Publish branch to remote'
                          : ''
                  }
                >
                  <span className="item-icon">{hasRemoteBranch ? '⬆️' : '📤'}</span>
                  <span>{hasRemoteBranch ? 'Push' : 'Publish'}</span>
                  {hasUnpushedCommits && (git.status?.ahead || 0) > 0 && (
                    <span className="item-badge">{git.status?.ahead}</span>
                  )}
                </button>

                <button
                  className="git-dropdown-item"
                  onClick={handlePull}
                  disabled={git.isLoading || !hasCommits || !hasRemoteBranch}
                  title={!hasCommits ? 'Create a commit first' : !hasRemoteBranch ? 'Publish branch first' : ''}
                >
                  <span className="item-icon">⬇️</span>
                  <span>Pull</span>
                </button>
              </>
            )}

            <div className="git-dropdown-divider" />

            <button
              className="git-dropdown-item"
              onClick={() => {
                setIsOpen(false);
                onOpenHistory();
              }}
              disabled={!hasCommits}
              title={!hasCommits ? 'No commits yet' : ''}
            >
              <span className="item-icon">📜</span>
              <span>History</span>
            </button>
          </div>
        )}
      </div>

      {showToast && (
        <div className={`git-toast ${showToast.type}`}>
          <span className="toast-message">{showToast.message}</span>
          <button
            className="toast-close"
            onClick={() => setShowToast(null)}
            title="Close"
          >
            ✕
          </button>
        </div>
      )}

      <GitStatusDialog
        isOpen={showStatus}
        onClose={() => setShowStatus(false)}
        status={git.status}
        onCommit={onOpenCommit}
      />
    </>
  );
};
