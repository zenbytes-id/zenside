import { ipcMain } from 'electron';
import { gitService } from '../services/git';
import { StatusResult, LogResult, DefaultLogFields } from 'simple-git';

/**
 * Register all git-related IPC handlers
 */
export function registerGitHandlers(): void {
  console.log('[Git Handlers] Registering git IPC handlers');

  // Initialize git service with sync directory
  ipcMain.handle('git:initialize', async (_, syncDirectory: string): Promise<void> => {
    console.log('[Git Handlers] git:initialize called with:', syncDirectory);
    try {
      await gitService.initialize(syncDirectory);
    } catch (error) {
      console.error('[Git Handlers] Error initializing git service:', error);
      throw error;
    }
  });

  // Check if directory is a git repository
  ipcMain.handle('git:isRepository', async (): Promise<boolean> => {
    console.log('[Git Handlers] git:isRepository called');
    try {
      return await gitService.isRepository();
    } catch (error) {
      console.error('[Git Handlers] Error checking if repository:', error);
      return false;
    }
  });

  // Check if git is installed
  ipcMain.handle('git:isGitInstalled', async (): Promise<boolean> => {
    console.log('[Git Handlers] git:isGitInstalled called');
    try {
      return await gitService.isGitInstalled();
    } catch (error) {
      console.error('[Git Handlers] Error checking if git installed:', error);
      return false;
    }
  });

  // Initialize a new git repository
  ipcMain.handle('git:init', async (): Promise<void> => {
    console.log('[Git Handlers] git:init called');
    try {
      await gitService.init();
    } catch (error) {
      console.error('[Git Handlers] Error initializing repository:', error);
      throw error;
    }
  });

  // Get repository status
  ipcMain.handle('git:status', async () => {
    try {
      const status = await gitService.status();
      // Convert to plain object to avoid IPC cloning issues
      const plainStatus = JSON.parse(JSON.stringify(status));
      return plainStatus;
    } catch (error) {
      console.error('[Git Handlers] Error getting status:', error);
      throw error;
    }
  });

  // Get commit log
  ipcMain.handle('git:log', async (_, maxCount: number = 50) => {
    console.log('[Git Handlers] git:log called with maxCount:', maxCount);
    try {
      const log = await gitService.log(maxCount);
      // Convert to plain object to avoid IPC cloning issues
      const plainLog = JSON.parse(JSON.stringify(log));
      return plainLog;
    } catch (error) {
      console.error('[Git Handlers] Error getting log:', error);
      throw error;
    }
  });

  // Add files to staging
  ipcMain.handle('git:add', async (_, files: string | string[]): Promise<void> => {
    console.log('[Git Handlers] git:add called with:', files);
    try {
      await gitService.add(files);
    } catch (error) {
      console.error('[Git Handlers] Error adding files:', error);
      throw error;
    }
  });

  // Commit changes
  ipcMain.handle('git:commit', async (_, message: string, files?: string[]): Promise<void> => {
    console.log('[Git Handlers] git:commit called with message:', message);
    try {
      await gitService.commit(message, files);
    } catch (error) {
      console.error('[Git Handlers] Error committing:', error);
      throw error;
    }
  });

  // Push to remote
  ipcMain.handle('git:push', async (_, remote: string = 'origin', branch?: string): Promise<void> => {
    console.log('[Git Handlers] git:push called with:', remote, branch);
    try {
      await gitService.push(remote, branch);
    } catch (error) {
      console.error('[Git Handlers] Error pushing:', error);
      throw error;
    }
  });

  // Pull from remote
  ipcMain.handle('git:pull', async (_, remote?: string, branch?: string): Promise<void> => {
    const effectiveRemote = remote || 'origin';
    console.log('[Git Handlers] git:pull called with:', effectiveRemote, branch);
    try {
      await gitService.pull(effectiveRemote, branch);
    } catch (error) {
      console.error('[Git Handlers] Error pulling:', error);
      throw error;
    }
  });

  // Add a remote
  ipcMain.handle('git:addRemote', async (_, name: string, url: string): Promise<void> => {
    console.log('[Git Handlers] git:addRemote called with:', name, url);
    try {
      await gitService.addRemote(name, url);
    } catch (error) {
      console.error('[Git Handlers] Error adding remote:', error);
      throw error;
    }
  });

  // Get remotes
  ipcMain.handle('git:getRemotes', async (): Promise<Array<{ name: string; refs: { fetch: string; push: string } }>> => {
    console.log('[Git Handlers] git:getRemotes called');
    try {
      return await gitService.getRemotes();
    } catch (error) {
      console.error('[Git Handlers] Error getting remotes:', error);
      throw error;
    }
  });

  // Remove remote
  ipcMain.handle('git:removeRemote', async (_, name: string): Promise<void> => {
    console.log('[Git Handlers] git:removeRemote called with:', name);
    try {
      await gitService.removeRemote(name);
    } catch (error) {
      console.error('[Git Handlers] Error removing remote:', error);
      throw error;
    }
  });

  // Set remote URL
  ipcMain.handle('git:setRemoteURL', async (_, name: string, url: string): Promise<void> => {
    console.log('[Git Handlers] git:setRemoteURL called with:', name, url);
    try {
      await gitService.setRemoteURL(name, url);
    } catch (error) {
      console.error('[Git Handlers] Error setting remote URL:', error);
      throw error;
    }
  });

  // Get current branch
  ipcMain.handle('git:getCurrentBranch', async (): Promise<string> => {
    console.log('[Git Handlers] git:getCurrentBranch called');
    try {
      return await gitService.getCurrentBranch();
    } catch (error) {
      console.error('[Git Handlers] Error getting current branch:', error);
      throw error;
    }
  });

  // Checkout branch
  ipcMain.handle('git:checkout', async (_, branch: string): Promise<void> => {
    console.log('[Git Handlers] git:checkout called with:', branch);
    try {
      await gitService.checkout(branch);
    } catch (error) {
      console.error('[Git Handlers] Error checking out branch:', error);
      throw error;
    }
  });

  // Test remote connection
  ipcMain.handle('git:testConnection', async (_, remoteName: string = 'origin') => {
    console.log('[Git Handlers] git:testConnection called with:', remoteName);
    try {
      return await gitService.testRemoteConnection(remoteName);
    } catch (error) {
      console.error('[Git Handlers] Error testing connection:', error);
      throw error;
    }
  });

  console.log('[Git Handlers] Git IPC handlers registered successfully');
}
