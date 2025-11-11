export interface Note {
  id: string;
  content: string;
  type: 'markdown' | 'plaintext' | 'code';
  color?: string;
  folderId?: string;
  createdAt: Date;
  updatedAt: Date;
  githubPath?: string;
  isDirty: boolean;
  order: number; // Higher numbers appear first (newest at top)
  // Note: title is derived from first line of content via extractTitle()
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  parentId?: string;
  githubPath?: string;
}

export type PanelSide = 'left' | 'right';

export interface AppSettings {
  panelSide: PanelSide;
  panelWidth: number;
  hotSideEnabled: boolean;
  autoHideDelay: number;
  showPanelOnStartup: boolean; // Whether to show panel when app starts
  githubToken?: string;
  githubUsername?: string;
  githubRepo?: string;
}

export type CategoryType = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}
