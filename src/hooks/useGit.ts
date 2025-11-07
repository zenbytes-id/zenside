import { useState, useEffect, useCallback } from 'react';
import { GitStatusResult, GitLogResult, GitRemote } from '../types/electron';

/**
 * React hook for git operations
 * Provides state and methods for interacting with git
 */
export function useGit(syncDirectory: string | null) {
  const [isRepository, setIsRepository] = useState(false);
  const [isGitInstalled, setIsGitInstalled] = useState(false);
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize git service when sync directory changes
  useEffect(() => {
    const initialize = async () => {
      if (!syncDirectory) {
        setIsRepository(false);
        return;
      }

      try {
        // Initialize git service with sync directory
        await window.electronAPI?.git.initialize(syncDirectory);

        // Check if git is installed
        const installed = await window.electronAPI?.git.isGitInstalled();
        setIsGitInstalled(installed || false);

        if (!installed) {
          console.log('[useGit] Git not installed');
          return;
        }

        // Check if directory is a git repository
        const isRepo = await window.electronAPI?.git.isRepository();
        console.log('[useGit] Is repository:', isRepo);
        setIsRepository(isRepo || false);

        if (isRepo) {
          // Load initial data - force refresh since state hasn't updated yet
          console.log('[useGit] Loading initial data...');
          await refreshStatus(true);
          await refreshBranch(true);
          await refreshRemotes(true);
          console.log('[useGit] Initial data loaded');
        }
      } catch (err) {
        console.error('[useGit] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize git');
      }
    };

    initialize();

    // Listen for git repository initialization events
    const handleRepoInit = () => {
      console.log('[useGit] Received git:repo-initialized event, rechecking...');
      recheckRepository();
    };

    window.addEventListener('git:repo-initialized', handleRepoInit);

    return () => {
      window.removeEventListener('git:repo-initialized', handleRepoInit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncDirectory]);

  // Refresh git status (with optional force parameter to bypass isRepository check)
  const refreshStatus = useCallback(async (force: boolean = false) => {
    if (!window.electronAPI?.git) {
      return;
    }

    try {
      const gitStatus = await window.electronAPI.git.status();
      setStatus(gitStatus);
      setError(null);
    } catch (err) {
      console.error('[useGit] Error refreshing status:', err);
      setError(err instanceof Error ? err.message : 'Failed to get status');
    }
  }, []);

  // Refresh current branch (with optional force parameter)
  const refreshBranch = useCallback(async (force: boolean = false) => {
    if (!window.electronAPI?.git) {
      return;
    }

    try {
      const branch = await window.electronAPI.git.getCurrentBranch();
      setCurrentBranch(branch);
      setError(null);
    } catch (err) {
      console.error('[useGit] Error refreshing branch:', err);
      setError(err instanceof Error ? err.message : 'Failed to get branch');
    }
  }, []);

  // Refresh remotes (with optional force parameter)
  const refreshRemotes = useCallback(async (force: boolean = false) => {
    if (!window.electronAPI?.git) {
      return;
    }

    try {
      const gitRemotes = await window.electronAPI.git.getRemotes();
      setRemotes(gitRemotes);
      setError(null);
    } catch (err) {
      console.error('[useGit] Error refreshing remotes:', err);
      setError(err instanceof Error ? err.message : 'Failed to get remotes');
    }
  }, []);

  // Re-check if directory is a repository (useful after init)
  const recheckRepository = useCallback(async () => {
    if (!window.electronAPI?.git) {
      return;
    }

    try {
      const isRepo = await window.electronAPI.git.isRepository();
      console.log('[useGit] Rechecked repository status:', isRepo);
      setIsRepository(isRepo || false);

      if (isRepo) {
        // Load data if it's now a repository
        await refreshStatus(true);
        await refreshBranch(true);
        await refreshRemotes(true);
      }
    } catch (err) {
      console.error('[useGit] Error rechecking repository:', err);
    }
  }, [refreshStatus, refreshBranch, refreshRemotes]);

  // Initialize git repository
  const init = useCallback(async () => {
    if (!window.electronAPI?.git) {
      throw new Error('Git API not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useGit] Initializing repository...');
      await window.electronAPI.git.init();
      setIsRepository(true);

      // Force refresh even though state hasn't updated yet
      console.log('[useGit] Repository initialized, forcing status refresh...');
      await refreshStatus(true);
      await refreshBranch(true);
      await refreshRemotes(true);
      console.log('[useGit] Init complete');

      // Broadcast event to other components
      window.dispatchEvent(new CustomEvent('git:repo-initialized'));
      console.log('[useGit] Broadcasted git:repo-initialized event');
    } catch (err) {
      console.error('[useGit] Error initializing repository:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize repository');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus, refreshBranch, refreshRemotes]);

  // Get commit log
  const getLog = useCallback(async (maxCount: number = 50): Promise<GitLogResult> => {
    if (!window.electronAPI?.git) {
      throw new Error('Git API not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      const log = await window.electronAPI.git.log(maxCount);
      return log;
    } catch (err) {
      console.error('[useGit] Error getting log:', err);
      setError(err instanceof Error ? err.message : 'Failed to get log');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add files to staging
  const add = useCallback(async (files: string | string[]) => {
    if (!window.electronAPI?.git) {
      throw new Error('Git API not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      await window.electronAPI.git.add(files);
      await refreshStatus();
    } catch (err) {
      console.error('[useGit] Error adding files:', err);
      setError(err instanceof Error ? err.message : 'Failed to add files');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Commit changes
  const commit = useCallback(async (message: string, files?: string[]) => {
    if (!window.electronAPI?.git) {
      throw new Error('Git API not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      await window.electronAPI.git.commit(message, files);
      await refreshStatus();
    } catch (err) {
      console.error('[useGit] Error committing:', err);
      setError(err instanceof Error ? err.message : 'Failed to commit');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Push to remote
  const push = useCallback(async (remote: string = 'origin', branch?: string) => {
    if (!window.electronAPI?.git) {
      throw new Error('Git API not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Only pass branch if it's defined to avoid sending undefined through IPC
      if (branch !== undefined) {
        await window.electronAPI.git.push(remote, branch);
      } else {
        await window.electronAPI.git.push(remote);
      }
      await refreshStatus();
    } catch (err) {
      console.error('[useGit] Error pushing:', err);
      setError(err instanceof Error ? err.message : 'Failed to push');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Pull from remote
  const pull = useCallback(async (remote: string = 'origin', branch?: string) => {
    if (!window.electronAPI?.git) {
      throw new Error('Git API not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Only pass branch if it's defined to avoid sending undefined through IPC
      if (branch !== undefined) {
        await window.electronAPI.git.pull(remote, branch);
      } else {
        await window.electronAPI.git.pull(remote);
      }
      await refreshStatus();
      // Note: After pull, the app should reload notes from filesystem
    } catch (err) {
      console.error('[useGit] Error pulling:', err);
      setError(err instanceof Error ? err.message : 'Failed to pull');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Add a remote
  const addRemote = useCallback(async (name: string, url: string) => {
    if (!window.electronAPI?.git) {
      throw new Error('Git API not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      await window.electronAPI.git.addRemote(name, url);
      await refreshRemotes();
    } catch (err) {
      console.error('[useGit] Error adding remote:', err);
      setError(err instanceof Error ? err.message : 'Failed to add remote');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRemotes]);

  // Remove a remote
  const removeRemote = useCallback(async (name: string) => {
    if (!window.electronAPI?.git) {
      throw new Error('Git API not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      await window.electronAPI.git.removeRemote(name);
      await refreshRemotes();
    } catch (err) {
      console.error('[useGit] Error removing remote:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove remote');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRemotes]);

  // Set remote URL
  const setRemoteURL = useCallback(async (name: string, url: string) => {
    if (!window.electronAPI?.git) {
      throw new Error('Git API not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      await window.electronAPI.git.setRemoteURL(name, url);
      await refreshRemotes();
    } catch (err) {
      console.error('[useGit] Error setting remote URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to set remote URL');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRemotes]);

  // Checkout branch
  const checkout = useCallback(async (branch: string) => {
    if (!window.electronAPI?.git) {
      throw new Error('Git API not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      await window.electronAPI.git.checkout(branch);
      await refreshBranch();
      await refreshStatus();
    } catch (err) {
      console.error('[useGit] Error checking out branch:', err);
      setError(err instanceof Error ? err.message : 'Failed to checkout branch');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshBranch, refreshStatus]);

  return {
    // State
    isRepository,
    isGitInstalled,
    status,
    currentBranch,
    remotes,
    isLoading,
    error,

    // Methods
    init,
    getLog,
    add,
    commit,
    push,
    pull,
    addRemote,
    removeRemote,
    setRemoteURL,
    checkout,
    refreshStatus,
    refreshBranch,
    refreshRemotes,
    recheckRepository,
  };
}
