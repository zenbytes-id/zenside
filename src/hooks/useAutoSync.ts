import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Hook for automatic git synchronization
 * Monitors file changes and syncs at configured intervals
 */
export function useAutoSync(
  syncDirectory: string | null,
  isRepository: boolean,
  hasRemotes: boolean,
  hasCommits: boolean
) {
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(60); // seconds
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastChangeTime, setLastChangeTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasUncommittedChangesRef = useRef(false);
  const syncInProgressRef = useRef(false);

  // Load settings from localStorage
  const loadSettings = useCallback(() => {
    const savedAutoSync = localStorage.getItem('git-auto-sync-enabled');
    const savedInterval = localStorage.getItem('git-auto-sync-interval');
    const savedLastSync = localStorage.getItem('git-auto-sync-last-time');
    const savedLastChange = localStorage.getItem('git-auto-sync-last-change');

    if (savedAutoSync !== null) {
      setIsAutoSyncEnabled(savedAutoSync === 'true');
    }
    if (savedInterval !== null) {
      setSyncInterval(parseInt(savedInterval, 10));
    }
    if (savedLastSync !== null) {
      setLastSyncTime(new Date(savedLastSync));
    }
    if (savedLastChange !== null) {
      setLastChangeTime(new Date(savedLastChange));
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Listen for setting changes from same window
  useEffect(() => {
    const handleSettingsChange = (event: CustomEvent) => {
      const { enabled, interval } = event.detail;
      setIsAutoSyncEnabled(enabled);
      setSyncInterval(interval);
    };

    window.addEventListener('git:auto-sync-changed' as any, handleSettingsChange);

    return () => {
      window.removeEventListener('git:auto-sync-changed' as any, handleSettingsChange);
    };
  }, []);

  // Listen for localStorage changes from other windows (e.g., settings window)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'git-auto-sync-enabled' && e.newValue !== null) {
        setIsAutoSyncEnabled(e.newValue === 'true');
      }
      if (e.key === 'git-auto-sync-interval' && e.newValue !== null) {
        setSyncInterval(parseInt(e.newValue, 10));
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Poll localStorage periodically as a fallback (storage event doesn't always fire)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadSettings();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(pollInterval);
  }, [loadSettings]);

  // Listen for file changes
  useEffect(() => {
    if (!isAutoSyncEnabled || !isRepository) {
      return;
    }

    const handleFileChange = () => {
      console.log('[AutoSync] File changed detected');
      const now = new Date();
      setLastChangeTime(now);
      localStorage.setItem('git-auto-sync-last-change', now.toISOString());
      hasUncommittedChangesRef.current = true;
    };

    window.electronAPI?.onFileChanged(handleFileChange);

    return () => {
      // Cleanup if needed
    };
  }, [isAutoSyncEnabled, isRepository]);

  // Perform sync operation
  const performSync = useCallback(async () => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current) {
      console.log('[AutoSync] Sync already in progress, skipping');
      return;
    }

    // Check prerequisites
    if (!isRepository || !hasRemotes || !hasCommits) {
      console.log('[AutoSync] Prerequisites not met:', { isRepository, hasRemotes, hasCommits });
      return;
    }

    try {
      // Get status first to check if there are actually changes or unpushed commits
      const status = await window.electronAPI?.git.status();

      // Skip sync only if there are no uncommitted changes AND no unpushed commits
      if (!status || (status.files.length === 0 && status.ahead === 0)) {
        console.log('[AutoSync] No uncommitted changes and no unpushed commits, skipping sync');
        hasUncommittedChangesRef.current = false;
        return;
      }

      // If there are unpushed commits but no uncommitted changes, skip commit and go straight to push
      const hasUncommittedChanges = status.files.length > 0;
      const hasUnpushedCommits = status.ahead > 0;

      // Prevent concurrent syncs
      if (syncInProgressRef.current) {
        console.log('[AutoSync] Sync already in progress, skipping');
        return;
      }

      syncInProgressRef.current = true;
      setIsSyncing(true);
      setSyncError(null);

      console.log('[AutoSync] Starting sync...', {
        uncommittedFiles: status.files.length,
        unpushedCommits: status.ahead
      });

      // Only commit if there are uncommitted changes
      if (hasUncommittedChanges) {
        console.log('[AutoSync] Staging and committing', status.files.length, 'files...');

        // Stage all changes
        await window.electronAPI?.git.add('.');

        // Commit with auto-generated message
        const timestamp = new Date().toISOString();
        const message = `Auto-sync: ${timestamp}`;
        await window.electronAPI?.git.commit(message);
      } else {
        console.log('[AutoSync] No uncommitted changes, skipping commit');
      }

      // Pull first to get remote changes (only if we have unpushed commits or just committed)
      if (hasUnpushedCommits || hasUncommittedChanges) {
        try {
          await window.electronAPI?.git.pull();
          console.log('[AutoSync] Pulled successfully');
        } catch (pullError) {
          // If pull fails, it might be because the branch doesn't exist remotely yet
          console.log('[AutoSync] Pull failed (might be first push):', pullError);
        }

        // Push changes
        await window.electronAPI?.git.push();
        console.log('[AutoSync] Pushed successfully');
      }

      console.log('[AutoSync] Sync completed successfully');
      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem('git-auto-sync-last-time', now.toISOString());
      // Clear last change time since we just synced
      setLastChangeTime(null);
      localStorage.removeItem('git-auto-sync-last-change');
      hasUncommittedChangesRef.current = false;
      setSyncError(null);

      // Trigger a custom event to notify GitMenu to refresh status
      window.dispatchEvent(new CustomEvent('git:sync-completed'));

    } catch (error) {
      console.error('[AutoSync] Sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(errorMessage);

      // Keep trying even if sync fails
      hasUncommittedChangesRef.current = true;
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [isRepository, hasRemotes, hasCommits]);

  // Schedule sync with debounce - timer resets on every file change
  useEffect(() => {
    // Clear existing timeout whenever dependencies change (including lastChangeTime)
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    // Don't schedule if auto-sync is disabled or prerequisites not met
    if (!isAutoSyncEnabled || !isRepository || !hasRemotes || !hasCommits) {
      console.log('[AutoSync] Not scheduling - prerequisites not met');
      return;
    }

    // Only schedule if there are pending changes (lastChangeTime is set)
    if (!lastChangeTime) {
      console.log('[AutoSync] No pending changes, timer stopped');
      return;
    }

    // Calculate delay from the last change time
    const now = Date.now();
    const syncTime = lastChangeTime.getTime() + (syncInterval * 1000);
    const delay = Math.max(0, syncTime - now);

    console.log(`[AutoSync] Timer started - will sync in ${Math.round(delay / 1000)}s (at ${new Date(syncTime).toLocaleTimeString()})`);
    console.log(`[AutoSync] Last change was at: ${lastChangeTime.toLocaleTimeString()}`);

    // Schedule the sync
    syncTimeoutRef.current = setTimeout(async () => {
      console.log('[AutoSync] Timer expired, starting sync...');
      await performSync();
      // Note: performSync clears lastChangeTime on success, which will stop the timer
      // Timer will only restart when user makes another change
    }, delay);

    // Cleanup function
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, [isAutoSyncEnabled, isRepository, hasRemotes, hasCommits, syncInterval, performSync, lastChangeTime]);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    hasUncommittedChangesRef.current = true; // Force sync
    await performSync();
  }, [performSync]);

  return {
    isAutoSyncEnabled,
    isSyncing,
    lastSyncTime,
    syncError,
    syncNow,
  };
}
