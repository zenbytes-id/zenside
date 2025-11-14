// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  togglePanel: () => ipcRenderer.send('toggle-panel'),
  getPanelState: () => ipcRenderer.invoke('get-panel-state'),
  openSettings: () => ipcRenderer.send('open-settings'),

  // Filesystem sync operations
  fs: {
    setSyncDirectory: (path) => ipcRenderer.invoke('fs:setSyncDirectory', path),
    getSyncDirectory: () => ipcRenderer.invoke('fs:getSyncDirectory'),
    selectDirectory: () => ipcRenderer.invoke('fs:selectDirectory'),
    saveNote: (note) => ipcRenderer.invoke('fs:saveNote', note),
    loadNotes: () => ipcRenderer.invoke('fs:loadNotes'),
    deleteNote: (noteId, note) => ipcRenderer.invoke('fs:deleteNote', noteId, note),
    deleteFolder: (folderId) => ipcRenderer.invoke('fs:deleteFolder', folderId),
    saveFolders: (folders) => ipcRenderer.invoke('fs:saveFolders', folders),
    loadFolders: () => ipcRenderer.invoke('fs:loadFolders'),
    watchChanges: () => ipcRenderer.invoke('fs:watchChanges'),
    stopWatching: () => ipcRenderer.invoke('fs:stopWatching'),
    openSyncFolder: () => ipcRenderer.invoke('fs:openSyncFolder'),
    isSyncEnabled: () => ipcRenderer.invoke('fs:isSyncEnabled'),
    clearSyncDirectory: () => ipcRenderer.invoke('fs:clearSyncDirectory'),
    getDefaultSyncPath: () => ipcRenderer.invoke('fs:getDefaultSyncPath')
  },

  // Filesystem change listener
  onFileChanged: (callback) => {
    ipcRenderer.on('fs:fileChanged', (_event, data) => callback(data));
  },

  // Sync directory cleared listener
  onSyncDirectoryCleared: (callback) => {
    ipcRenderer.on('fs:syncDirectoryCleared', () => callback());
  },

  // Sync directory changed listener
  onSyncDirectoryChanged: (callback) => {
    ipcRenderer.on('fs:syncDirectoryChanged', (_event, data) => callback(data));
  },

  // Search shortcut listener
  onOpenSearch: (callback) => {
    ipcRenderer.on('open-search', () => callback());
  },

  // Git operations
  git: {
    initialize: (syncDirectory) => ipcRenderer.invoke('git:initialize', syncDirectory),
    isRepository: () => ipcRenderer.invoke('git:isRepository'),
    isGitInstalled: () => ipcRenderer.invoke('git:isGitInstalled'),
    init: () => ipcRenderer.invoke('git:init'),
    status: () => ipcRenderer.invoke('git:status'),
    log: (maxCount) => ipcRenderer.invoke('git:log', maxCount),
    add: (files) => ipcRenderer.invoke('git:add', files),
    commit: (message, files) => ipcRenderer.invoke('git:commit', message, files),
    push: (remote, branch) => {
      // Only pass defined arguments to avoid sending undefined through IPC
      const args = ['git:push'];
      if (remote !== undefined) args.push(remote);
      if (branch !== undefined) args.push(branch);
      return ipcRenderer.invoke(...args);
    },
    pull: (remote, branch) => {
      // Only pass defined arguments to avoid sending undefined through IPC
      const args = ['git:pull'];
      if (remote !== undefined) args.push(remote);
      if (branch !== undefined) args.push(branch);
      return ipcRenderer.invoke(...args);
    },
    addRemote: (name, url) => ipcRenderer.invoke('git:addRemote', name, url),
    getRemotes: () => ipcRenderer.invoke('git:getRemotes'),
    removeRemote: (name) => ipcRenderer.invoke('git:removeRemote', name),
    setRemoteURL: (name, url) => ipcRenderer.invoke('git:setRemoteURL', name, url),
    getCurrentBranch: () => ipcRenderer.invoke('git:getCurrentBranch'),
    checkout: (branch) => ipcRenderer.invoke('git:checkout', branch),
    testConnection: (remoteName) => ipcRenderer.invoke('git:testConnection', remoteName)
  },

  // Finance operations
  finance: {
    initialize: (syncDirectory) => ipcRenderer.invoke('finance:initialize', syncDirectory),
    migrateToMonthlyFiles: () => ipcRenderer.invoke('finance:migrateToMonthlyFiles'),
    getAvailableMonths: () => ipcRenderer.invoke('finance:getAvailableMonths'),
    loadTransactionsByMonth: (monthKey) => ipcRenderer.invoke('finance:loadTransactionsByMonth', monthKey),
    loadRecentTransactions: (monthsBack) => ipcRenderer.invoke('finance:loadRecentTransactions', monthsBack),
    addTransaction: (transaction) => ipcRenderer.invoke('finance:addTransaction', transaction),
    updateTransaction: (oldTransaction, newTransaction) => ipcRenderer.invoke('finance:updateTransaction', oldTransaction, newTransaction),
    deleteTransaction: (transaction) => ipcRenderer.invoke('finance:deleteTransaction', transaction),
    getSummary: () => ipcRenderer.invoke('finance:getSummary'),
    recalculateAllBalances: (pockets) => ipcRenderer.invoke('finance:recalculateAllBalances', pockets),
    loadPockets: () => ipcRenderer.invoke('finance:loadPockets'),
    savePockets: (pockets) => ipcRenderer.invoke('finance:savePockets', pockets),
    loadCategories: () => ipcRenderer.invoke('finance:loadCategories'),
    saveCategories: (categories) => ipcRenderer.invoke('finance:saveCategories', categories),
    // Bill operations
    loadBills: () => ipcRenderer.invoke('finance:loadBills'),
    addBill: (bill) => ipcRenderer.invoke('finance:addBill', bill),
    updateBill: (bill) => ipcRenderer.invoke('finance:updateBill', bill),
    deleteBill: (billId) => ipcRenderer.invoke('finance:deleteBill', billId),
    reorderBills: (bills) => ipcRenderer.invoke('finance:reorderBills', bills),
    payBill: (billId, pocketId, amount, date, description) => ipcRenderer.invoke('finance:payBill', billId, pocketId, amount, date, description),
    getBillPaymentStatus: (billId, monthKey) => ipcRenderer.invoke('finance:getBillPaymentStatus', billId, monthKey),
    getBillPaymentHistory: (billId) => ipcRenderer.invoke('finance:getBillPaymentHistory', billId)
  },

  // App settings
  settings: {
    getShowPanelOnStartup: () => ipcRenderer.invoke('settings:getShowPanelOnStartup'),
    setShowPanelOnStartup: (value) => ipcRenderer.invoke('settings:setShowPanelOnStartup', value),
    getToggleShortcutEnabled: () => ipcRenderer.invoke('settings:getToggleShortcutEnabled'),
    setToggleShortcutEnabled: (value) => ipcRenderer.invoke('settings:setToggleShortcutEnabled', value),
    getToggleShortcut: () => ipcRenderer.invoke('settings:getToggleShortcut'),
    setToggleShortcut: (value) => ipcRenderer.invoke('settings:setToggleShortcut', value)
  }
});
