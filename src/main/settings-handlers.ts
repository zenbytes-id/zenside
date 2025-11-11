import { ipcMain } from 'electron';
import Store from 'electron-store';

interface SettingsSchema {
  showPanelOnStartup: boolean;
  toggleShortcutEnabled: boolean;
  toggleShortcut: string;
}

class SettingsStore {
  private store: Store<SettingsSchema>;

  constructor() {
    this.store = new Store<SettingsSchema>({
      name: 'app-settings',
      defaults: {
        showPanelOnStartup: true, // Default to showing panel on startup
        toggleShortcutEnabled: false, // Shortcuts disabled by default
        toggleShortcut: 'CommandOrControl+Shift+S' // Default shortcut
      }
    });
  }

  getShowPanelOnStartup(): boolean {
    return (this.store as any).get('showPanelOnStartup');
  }

  setShowPanelOnStartup(value: boolean): void {
    (this.store as any).set('showPanelOnStartup', value);
  }

  getToggleShortcutEnabled(): boolean {
    return (this.store as any).get('toggleShortcutEnabled');
  }

  setToggleShortcutEnabled(value: boolean): void {
    (this.store as any).set('toggleShortcutEnabled', value);
  }

  getToggleShortcut(): string {
    return (this.store as any).get('toggleShortcut');
  }

  setToggleShortcut(value: string): void {
    (this.store as any).set('toggleShortcut', value);
  }
}

const settingsStore = new SettingsStore();

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:getShowPanelOnStartup', async () => {
    return settingsStore.getShowPanelOnStartup();
  });

  ipcMain.handle('settings:setShowPanelOnStartup', async (_event, value: boolean) => {
    settingsStore.setShowPanelOnStartup(value);
    return { success: true };
  });

  ipcMain.handle('settings:getToggleShortcutEnabled', async () => {
    return settingsStore.getToggleShortcutEnabled();
  });

  ipcMain.handle('settings:setToggleShortcutEnabled', async (_event, value: boolean) => {
    settingsStore.setToggleShortcutEnabled(value);
    return { success: true };
  });

  ipcMain.handle('settings:getToggleShortcut', async () => {
    return settingsStore.getToggleShortcut();
  });

  ipcMain.handle('settings:setToggleShortcut', async (_event, value: string) => {
    settingsStore.setToggleShortcut(value);
    return { success: true };
  });
}

// Export the settings store for use in main process
export { settingsStore };
