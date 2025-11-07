import { Note, Folder } from './note';
import { Transaction, Pocket, Category } from './finance';

// Git types from simple-git
export interface GitStatusResult {
  files: Array<{
    path: string;
    index: string;
    working_dir: string;
  }>;
  ahead: number;
  behind: number;
  current: string | null;
  tracking: string | null;
  isClean: () => boolean;
}

export interface GitLogEntry {
  hash: string;
  date: string;
  message: string;
  author_name: string;
  author_email: string;
}

export interface GitLogResult {
  all: GitLogEntry[];
  total: number;
  latest: GitLogEntry | null;
}

export interface GitRemote {
  name: string;
  refs: {
    fetch: string;
    push: string;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }

  interface ElectronAPI {
    togglePanel: () => void;
    getPanelState: () => Promise<boolean>;
    openSettings: () => void;
    fs: {
      setSyncDirectory: (path: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      getSyncDirectory: () => Promise<string | null>;
      selectDirectory: () => Promise<string | null>;
      saveNote: (note: Note) => Promise<{ success: boolean; error?: string }>;
      loadNotes: () => Promise<{ success: boolean; notes?: Note[]; error?: string }>;
      deleteNote: (noteId: string, note?: Note) => Promise<{ success: boolean; error?: string }>;
      deleteFolder: (folderId: string) => Promise<{ success: boolean; error?: string }>;
      saveFolders: (folders: Folder[]) => Promise<{ success: boolean; error?: string }>;
      loadFolders: () => Promise<{ success: boolean; folders?: Folder[]; error?: string }>;
      watchChanges: () => Promise<{ success: boolean; error?: string }>;
      stopWatching: () => Promise<{ success: boolean; error?: string }>;
      openSyncFolder: () => Promise<{ success: boolean; error?: string }>;
      isSyncEnabled: () => Promise<boolean>;
      clearSyncDirectory: () => Promise<{ success: boolean; error?: string }>;
      getDefaultSyncPath: () => Promise<string>;
    };
    onFileChanged: (callback: (data: { type: 'note' | 'folder'; action: 'add' | 'change' | 'unlink'; filePath: string }) => void) => void;
    onSyncDirectoryCleared: (callback: () => void) => void;
    onSyncDirectoryChanged: (callback: (data: { directory: string }) => void) => void;
    onOpenSearch: (callback: () => void) => void;
    git: {
      initialize: (syncDirectory: string) => Promise<void>;
      isRepository: () => Promise<boolean>;
      isGitInstalled: () => Promise<boolean>;
      init: () => Promise<void>;
      status: () => Promise<GitStatusResult>;
      log: (maxCount?: number) => Promise<GitLogResult>;
      add: (files: string | string[]) => Promise<void>;
      commit: (message: string, files?: string[]) => Promise<void>;
      push: (remote?: string, branch?: string) => Promise<void>;
      pull: (remote?: string, branch?: string) => Promise<void>;
      addRemote: (name: string, url: string) => Promise<void>;
      getRemotes: () => Promise<GitRemote[]>;
      removeRemote: (name: string) => Promise<void>;
      setRemoteURL: (name: string, url: string) => Promise<void>;
      getCurrentBranch: () => Promise<string>;
      checkout: (branch: string) => Promise<void>;
      testConnection: (remoteName?: string) => Promise<{ success: boolean; message: string }>;
    };
    finance: {
      initialize: (syncDirectory: string) => Promise<void>;
      migrateToMonthlyFiles: () => Promise<void>;
      getAvailableMonths: () => Promise<string[]>;
      loadTransactionsByMonth: (monthKey: string) => Promise<Transaction[]>;
      loadRecentTransactions: (monthsBack?: number) => Promise<Transaction[]>;
      addTransaction: (transaction: Transaction) => Promise<void>;
      updateTransaction: (oldTransaction: Transaction, newTransaction: Transaction) => Promise<void>;
      deleteTransaction: (transaction: Transaction) => Promise<void>;
      getSummary: () => Promise<import('./finance').FinanceSummary>;
      recalculateAllBalances: (pockets: Pocket[]) => Promise<Pocket[]>;
      loadPockets: () => Promise<Pocket[]>;
      savePockets: (pockets: Pocket[]) => Promise<void>;
      loadCategories: () => Promise<Category[]>;
      saveCategories: (categories: Category[]) => Promise<void>;
    };
  }
}

export {};