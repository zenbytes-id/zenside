import { simpleGit, SimpleGit, StatusResult, LogResult, DefaultLogFields } from 'simple-git';
import path from 'path';
import fs from 'fs';

/**
 * Git service wrapper around simple-git
 * Provides git operations for the sync directory
 */
export class GitService {
  private git: SimpleGit | null = null;
  private syncDirectory: string | null = null;

  /**
   * Initialize git service with a sync directory
   */
  async initialize(syncDir: string): Promise<void> {
    this.syncDirectory = syncDir;
    this.git = simpleGit(syncDir);
    console.log('[GitService] Initialized with directory:', syncDir);
  }

  /**
   * Check if the directory is a git repository
   */
  async isRepository(): Promise<boolean> {
    if (!this.git || !this.syncDirectory) {
      return false;
    }

    try {
      const gitDir = path.join(this.syncDirectory, '.git');
      return fs.existsSync(gitDir);
    } catch (error) {
      console.error('[GitService] Error checking if directory is a repository:', error);
      return false;
    }
  }

  /**
   * Check if git is installed on the system
   */
  async isGitInstalled(): Promise<boolean> {
    try {
      if (!this.git) {
        return false;
      }
      await this.git.version();
      return true;
    } catch (error) {
      console.error('[GitService] Git not installed:', error);
      return false;
    }
  }

  /**
   * Initialize a new git repository
   */
  async init(): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      await this.git.init();
      // Set default branch to 'main' instead of 'master'
      await this.git.raw(['branch', '-M', 'main']);
      console.log('[GitService] Repository initialized with main branch');
    } catch (error) {
      console.error('[GitService] Error initializing repository:', error);
      throw error;
    }
  }

  /**
   * Get the status of the repository
   */
  async status(): Promise<StatusResult> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      const status = await this.git.status();
      // console.log('[GitService] Status:', {
      //   files: status.files.length,
      //   ahead: status.ahead,
      //   behind: status.behind,
      //   current: status.current,
      // });
      return status;
    } catch (error) {
      console.error('[GitService] Error getting status:', error);
      throw error;
    }
  }

  /**
   * Get commit history
   */
  async log(maxCount: number = 50): Promise<LogResult<DefaultLogFields>> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      const log = await this.git.log({ maxCount });
      console.log('[GitService] Log retrieved:', log.total, 'commits');
      return log;
    } catch (error) {
      // Handle "no commits yet" error gracefully
      if (error instanceof Error && error.message.includes('does not have any commits yet')) {
        console.log('[GitService] No commits yet, returning empty log');
        return { all: [], total: 0, latest: null };
      }
      console.error('[GitService] Error getting log:', error);
      throw error;
    }
  }

  /**
   * Add files to staging area
   */
  async add(files: string | string[]): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      await this.git.add(files);
      console.log('[GitService] Added files:', files);
    } catch (error) {
      console.error('[GitService] Error adding files:', error);

      // Handle lock file errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('index.lock')) {
        // Try to remove the lock file and retry once
        if (this.syncDirectory) {
          const lockFile = path.join(this.syncDirectory, '.git', 'index.lock');
          try {
            if (fs.existsSync(lockFile)) {
              fs.unlinkSync(lockFile);
              console.log('[GitService] Removed stale lock file, retrying...');
              await this.git.add(files);
              console.log('[GitService] Added files after lock file removal:', files);
              return;
            }
          } catch (lockError) {
            console.error('[GitService] Failed to remove lock file:', lockError);
          }
        }
        throw new Error('Git repository is locked. Another git process may be running. Please try again in a moment.');
      }

      throw error;
    }
  }

  /**
   * Commit changes
   */
  async commit(message: string, files?: string[]): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      if (files && files.length > 0) {
        await this.git.commit(message, files);
      } else {
        await this.git.commit(message);
      }
      console.log('[GitService] Committed:', message);
    } catch (error) {
      console.error('[GitService] Error committing:', error);
      throw error;
    }
  }

  /**
   * Push to remote
   */
  async push(remote: string = 'origin', branch?: string): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      // Get current branch if not specified
      const currentBranch = branch || await this.getCurrentBranch();

      // Check if upstream is set by checking git status
      const status = await this.git.status();
      const needsUpstream = !status.tracking;

      if (needsUpstream) {
        // First push - set upstream with -u flag
        console.log('[GitService] First push detected, setting upstream:', remote, currentBranch);
        await this.git.push(['-u', remote, currentBranch]);
        console.log('[GitService] Pushed and set upstream:', remote, currentBranch);
      } else {
        // Normal push - upstream already exists
        if (branch) {
          await this.git.push(remote, branch);
        } else {
          await this.git.push();
        }
        console.log('[GitService] Pushed to', remote, branch || '(current branch)');
      }
    } catch (error) {
      console.error('[GitService] Error pushing:', error);

      // Provide user-friendly error messages
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('correct access rights')) {
        throw new Error('Permission denied. Please check:\n1. Remote URL is correct\n2. You have push access\n3. SSH key is configured (for SSH URLs)\n4. Personal access token is set (for HTTPS URLs)');
      } else if (errorMessage.includes('repository not found') || errorMessage.includes('does not appear to be a git repository')) {
        throw new Error('Remote repository not found. Please:\n1. Check the remote URL in Settings\n2. Ensure the repository exists on GitHub/GitLab\n3. Verify you have access to the repository');
      } else if (errorMessage.includes('remote origin already exists')) {
        throw new Error('Remote already configured. Use Settings to update the remote URL.');
      } else if (errorMessage.includes('no upstream')) {
        throw new Error('No remote configured. Please add a remote in Git Settings first.');
      }

      throw error;
    }
  }

  /**
   * Pull from remote
   */
  async pull(remote: string = 'origin', branch?: string): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      // Get current branch if not specified
      const currentBranch = branch || await this.getCurrentBranch();

      // Check if upstream is set
      const status = await this.git.status();
      const hasUpstream = !!status.tracking;

      // Check if we're already in sync
      if (status.ahead === 0 && status.behind === 0 && hasUpstream) {
        console.log('[GitService] Already up to date');
        // Still do a fetch to make sure we have the latest info
        await this.git.fetch(remote);
        return;
      }

      if (hasUpstream && !branch) {
        // If upstream is set and no explicit branch was requested, use simple pull
        await this.git.pull();
        console.log('[GitService] Pulled from upstream');
      } else {
        // No upstream or explicit branch requested - use fetch + merge approach
        console.log(`[GitService] Attempting to fetch ${remote}/${currentBranch}...`);

        // Check if the remote branch exists first
        try {
          const lsRemoteResult = await this.git.raw(['ls-remote', '--heads', remote, `refs/heads/${currentBranch}`]);
          console.log('[GitService] ls-remote result:', lsRemoteResult);

          // If the result is empty, the branch doesn't exist
          if (!lsRemoteResult || lsRemoteResult.trim() === '') {
            console.log('[GitService] Remote branch does not exist (empty result)');
            throw new Error(`Branch '${currentBranch}' doesn't exist on remote '${remote}'.\n\nYou need to push this branch to the remote first:\n1. Click Push to upload your local commits\n2. Then you can pull to sync future changes`);
          }

          console.log('[GitService] Remote branch exists');
        } catch (lsRemoteError) {
          // Check if it's our custom error or a git error
          if (lsRemoteError instanceof Error && lsRemoteError.message.includes('doesn\'t exist on remote')) {
            throw lsRemoteError;
          }

          // Remote branch doesn't exist or can't reach remote
          console.log('[GitService] Remote branch check failed:', lsRemoteError);
          throw new Error(`Branch '${currentBranch}' doesn't exist on remote '${remote}'.\n\nYou need to push this branch to the remote first:\n1. Click Push to upload your local commits\n2. Then you can pull to sync future changes`);
        }

        // First, fetch from remote
        await this.git.fetch(remote, currentBranch);

        // Check if there's anything to merge
        const statusAfterFetch = await this.git.status();
        if (statusAfterFetch.behind === 0) {
          console.log('[GitService] Already up to date after fetch');
          return;
        }

        // Then merge the fetched branch
        await this.git.merge([`${remote}/${currentBranch}`]);

        console.log('[GitService] Pulled (fetch+merge) from', remote, currentBranch);
      }
    } catch (error) {
      console.error('[GitService] Error pulling:', error);

      // Provide user-friendly error messages
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('no tracking information')) {
        throw new Error(`No upstream configured for branch '${await this.getCurrentBranch()}'.\n\nThe remote repository may not have this branch, or you need to push your branch first.`);
      } else if (errorMessage.includes('Couldn\'t find remote ref') || errorMessage.includes('couldn\'t find remote ref')) {
        const currentBranch = await this.getCurrentBranch();
        throw new Error(`Branch '${currentBranch}' doesn't exist on remote '${remote}'.\n\nYou need to push this branch to the remote first:\n1. Click Push to upload your local commits\n2. Then you can pull to sync future changes`);
      } else if (errorMessage.includes('Repository not found') || errorMessage.includes('does not appear to be a git repository')) {
        throw new Error(`Remote repository '${remote}' not found.\n\nPlease check your Git Settings to ensure the remote URL is correct.`);
      } else if (errorMessage.includes('Permission denied') || errorMessage.includes('correct access rights')) {
        throw new Error(`Permission denied.\n\nPlease check your authentication credentials in Git Settings.`);
      }

      throw error;
    }
  }

  /**
   * Add a remote
   */
  async addRemote(name: string, url: string): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      await this.git.addRemote(name, url);
      console.log('[GitService] Added remote:', name, url);
    } catch (error) {
      console.error('[GitService] Error adding remote:', error);
      throw error;
    }
  }

  /**
   * Get remotes
   */
  async getRemotes(): Promise<Array<{ name: string; refs: { fetch: string; push: string } }>> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      const remotes = await this.git.getRemotes(true);
      console.log('[GitService] Remotes:', remotes);
      return remotes;
    } catch (error) {
      console.error('[GitService] Error getting remotes:', error);
      throw error;
    }
  }

  /**
   * Remove a remote
   */
  async removeRemote(name: string): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      await this.git.removeRemote(name);
      console.log('[GitService] Removed remote:', name);
    } catch (error) {
      console.error('[GitService] Error removing remote:', error);
      throw error;
    }
  }

  /**
   * Set remote URL
   */
  async setRemoteURL(name: string, url: string): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      await this.git.remote(['set-url', name, url]);
      console.log('[GitService] Set remote URL:', name, url);
    } catch (error) {
      console.error('[GitService] Error setting remote URL:', error);
      throw error;
    }
  }

  /**
   * Get current branch
   */
  async getCurrentBranch(): Promise<string> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      const status = await this.git.status();
      return status.current || 'main';
    } catch (error) {
      console.error('[GitService] Error getting current branch:', error);
      throw error;
    }
  }

  /**
   * Checkout a branch
   */
  async checkout(branch: string): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      await this.git.checkout(branch);
      console.log('[GitService] Checked out branch:', branch);
    } catch (error) {
      console.error('[GitService] Error checking out branch:', error);
      throw error;
    }
  }

  /**
   * Test remote connection
   */
  async testRemoteConnection(remoteName: string = 'origin'): Promise<{ success: boolean; message: string }> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      console.log('[GitService] Testing remote connection:', remoteName);

      // Use ls-remote to test connection without pulling/pushing
      await this.git.raw(['ls-remote', '--exit-code', remoteName]);

      console.log('[GitService] Remote connection successful');
      return {
        success: true,
        message: 'Connection successful! Remote is reachable and you have access.'
      };
    } catch (error) {
      console.error('[GitService] Remote connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('correct access rights') || errorMessage.includes('Permission denied')) {
        return {
          success: false,
          message: 'Permission denied. Check your SSH keys or Personal Access Token.'
        };
      } else if (errorMessage.includes('Could not resolve host')) {
        return {
          success: false,
          message: 'Cannot resolve host. Check your internet connection and remote URL.'
        };
      } else if (errorMessage.includes('Repository not found') || errorMessage.includes('does not appear to be a git repository')) {
        return {
          success: false,
          message: 'Repository not found. Verify the URL and that the repository exists.'
        };
      } else {
        return {
          success: false,
          message: `Connection failed: ${errorMessage}`
        };
      }
    }
  }
}

// Singleton instance
export const gitService = new GitService();
