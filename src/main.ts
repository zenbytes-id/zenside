import { app, BrowserWindow, screen, globalShortcut, ipcMain, Tray, Menu, nativeImage, systemPreferences, dialog, shell, powerMonitor } from 'electron';
import * as path from 'path';
import { registerFilesystemHandlers } from './main/fs-handlers';
import { registerGitHandlers } from './main/git-handlers';
import { registerFinanceHandlers } from './main/finance-handlers';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

class WindowManager {
  private edgeBar: BrowserWindow | null = null;
  private mainPanel: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private panelPosition: 'left' | 'right' = 'left';
  private panelWidth = 384;
  private isAnimating = false;
  private isPanelVisible = false;
  private mouseTrackingInterval: NodeJS.Timeout | null = null;
  private hideTimeout: NodeJS.Timeout | null = null;
  private lastMousePosition: { x: number; y: number } | null = null;
  private isHotBarVisible = true;

  constructor(position: 'left' | 'right' = 'left') {
    this.panelPosition = position;
  }

  async createWindows() {
    // Check accessibility permissions on macOS (required for screen tracking)
    if (process.platform === 'darwin') {
      await this.checkAccessibilityPermissions();
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Create menu bar (tray) icon
    this.createTray();

    // Create the invisible edge bar (trigger zone)
    this.createEdgeBar(screenWidth, screenHeight);

    // Create the main panel window
    this.createMainPanel(screenWidth, screenHeight);

    // Set up hot bar (edge bar as hot bar)
    this.setupEdgeBarListeners();

    // Register global keyboard shortcuts
    this.registerShortcuts();

    // Set up IPC handlers for window control
    this.setupIPC();

    // Show panel on startup with a small delay
    setTimeout(() => {
      this.slideIn();
    }, 500);

    // Start mouse tracking for auto-hide hot bar
    this.startMouseTracking();

    // Set up power monitor to handle sleep/wake events
    this.setupPowerMonitor();
  }

  private setupPowerMonitor() {
    // Handle macOS sleep/wake events to restore window state
    powerMonitor.on('suspend', () => {
      console.log('System going to sleep - saving panel state');
      // System is going to sleep - state is preserved
    });

    powerMonitor.on('resume', () => {
      console.log('System waking from sleep - restoring panel state');
      this.restoreWindowsAfterSleep();
    });

    powerMonitor.on('lock-screen', () => {
      console.log('Screen locked');
    });

    powerMonitor.on('unlock-screen', () => {
      console.log('Screen unlocked - checking window state');
      // Sometimes windows get destroyed on screen lock
      this.restoreWindowsAfterSleep();
    });
  }

  private restoreWindowsAfterSleep() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Check if windows still exist and are valid
    const edgeBarDestroyed = !this.edgeBar || this.edgeBar.isDestroyed();
    const mainPanelDestroyed = !this.mainPanel || this.mainPanel.isDestroyed();

    if (edgeBarDestroyed) {
      console.log('Edge bar destroyed after sleep - recreating');
      this.createEdgeBar(screenWidth, screenHeight);
      this.setupEdgeBarListeners();
    } else {
      // Ensure edge bar is in correct position
      const hotBarX = this.isPanelVisible ? this.panelWidth : 0;
      const hotBarY = Math.floor((screenHeight - 80) / 2);
      this.edgeBar.setPosition(hotBarX, hotBarY);
    }

    if (mainPanelDestroyed) {
      console.log('Main panel destroyed after sleep - recreating');
      this.createMainPanel(screenWidth, screenHeight);

      // Restore panel visibility state
      if (this.isPanelVisible) {
        // Panel was visible before sleep - show it again
        const targetX = this.panelPosition === 'left' ? 0 : screenWidth - this.panelWidth;
        this.mainPanel?.setPosition(targetX, 0);
        this.mainPanel?.showInactive();
      }
    } else {
      // Ensure main panel is in correct position
      if (this.isPanelVisible) {
        const targetX = this.panelPosition === 'left' ? 0 : screenWidth - this.panelWidth;
        this.mainPanel.setPosition(targetX, 0);
        this.mainPanel.showInactive();
      } else {
        const targetX = this.panelPosition === 'left' ? -this.panelWidth : screenWidth;
        this.mainPanel.setPosition(targetX, 0);
      }
    }

    console.log('Window state restored after sleep');
  }

  private async checkAccessibilityPermissions(): Promise<void> {
    const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);

    if (!isTrusted) {
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Accessibility Permission Required',
        message: 'ZenSide needs Accessibility permissions to detect screen edges',
        detail: 'This allows the app to:\n• Track mouse position for edge detection\n• Show the hot bar when cursor approaches screen edges\n• Provide smooth panel activation\n\nClick "Open Settings" to grant permission in System Preferences.',
        buttons: ['Open Settings', 'Remind Me Later'],
        defaultId: 0,
        cancelId: 1,
      });

      if (result.response === 0) {
        // Request accessibility permission - this will open System Preferences
        systemPreferences.isTrustedAccessibilityClient(true);

        // Also try to open System Preferences directly
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');

        // Show follow-up dialog
        await dialog.showMessageBox({
          type: 'info',
          title: 'Grant Permission',
          message: 'Please grant accessibility permission to ZenSide',
          detail: 'After granting permission:\n1. Find "ZenSide" in the list\n2. Check the checkbox next to it\n3. Restart the app for changes to take effect',
          buttons: ['OK'],
        });
      }
    }
  }

  private createTray() {
    // Load the custom note icon from assets folder (simple monochrome for menu bar)
    const iconPath = path.join(__dirname, '../assets/note.png');
    console.log('Loading tray icon from:', iconPath);

    // For macOS menu bar, create a template image (will adapt to light/dark mode)
    let icon: Electron.NativeImage;
    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        console.error('Icon is empty! Path might be wrong:', iconPath);
        console.error('Trying alternative path...');
        // Try alternative path
        const altPath = path.join(process.cwd(), 'assets/note.png');
        console.log('Alternative path:', altPath);
        icon = nativeImage.createFromPath(altPath);
        if (icon.isEmpty()) {
          console.error('Alternative path also failed. Using empty icon as fallback.');
          icon = nativeImage.createEmpty();
        }
      } else {
        console.log('✓ Icon loaded successfully, size:', icon.getSize());
      }

      // Only resize if icon is not empty
      if (!icon.isEmpty()) {
        // Resize to standard menu bar icon size (22x22 for macOS)
        icon = icon.resize({ width: 22, height: 22, quality: 'best' });
        // Set as template to work with dark mode (inverts colors automatically)
        icon.setTemplateImage(true);
      }
    } catch (error) {
      console.error('Failed to load tray icon from:', iconPath, error);
      // Create a simple fallback icon (empty)
      icon = nativeImage.createEmpty();
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip('ZenSide - Click to toggle notes panel');
    console.log('✓ Tray icon created (activation policy set to accessory in app.whenReady)');

    // Create tray menu
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Toggle Notes',
        click: () => {
          if (this.isPanelVisible) {
            this.slideOut();
          } else {
            this.slideIn();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'About ZenSide',
        click: () => {
          dialog.showMessageBox({
            type: 'info',
            title: 'About ZenSide',
            message: 'ZenSide v1.0.1',
            detail: 'A macOS side panel note-taking application\n\nShortcut: Cmd+Shift+S to toggle panel\nClick the hot bar on the left edge to show/hide',
            buttons: ['OK'],
          });
        },
      },
      { type: 'separator' },
      {
        label: 'Quit ZenSide',
        click: () => {
          app.quit();
        },
      },
    ]);

    // Left click to toggle panel
    this.tray.on('click', () => {
      console.log('Tray icon clicked, current state:', this.isPanelVisible);
      if (this.isPanelVisible) {
        this.slideOut();
      } else {
        this.slideIn();
      }
    });

    // Right click to show menu
    this.tray.on('right-click', () => {
      this.tray?.popUpContextMenu(contextMenu);
    });

    // For macOS, also set the context menu for long press
    this.tray.setContextMenu(contextMenu);

    // Note: No need to call app.dock.hide() here because:
    // LSUIElement: true in forge.config.js hides the dock icon at package time
    // This is the recommended approach for background/utility apps on macOS
    console.log('✓ App running as background utility (LSUIElement: true)');
  }

  private startMouseTracking() {
    // Track mouse position every 50ms for responsive detection
    this.mouseTrackingInterval = setInterval(() => {
      const currentPos = screen.getCursorScreenPoint();

      if (!this.edgeBar || this.edgeBar.isDestroyed()) return;

      // Check if mouse has moved
      const hasMoved = !this.lastMousePosition ||
        currentPos.x !== this.lastMousePosition.x ||
        currentPos.y !== this.lastMousePosition.y;

      if (hasMoved) {
        // Mouse is moving - show hot bar
        if (!this.isHotBarVisible) {
          this.showHotBar();
          this.isHotBarVisible = true;
        }

        // Clear existing hide timeout
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
          this.hideTimeout = null;
        }

        // Set new hide timeout for 800ms of inactivity
        this.hideTimeout = setTimeout(() => {
          this.hideHotBar();
          this.isHotBarVisible = false;
          this.hideTimeout = null;
        }, 800); // Hide after 0.8 seconds of cursor inactivity
      }

      // Update last position
      this.lastMousePosition = { x: currentPos.x, y: currentPos.y };
    }, 50); // Check every 50ms for smooth detection
  }

  private showHotBar() {
    if (this.edgeBar && !this.edgeBar.isDestroyed()) {
      this.edgeBar.webContents.executeJavaScript(`
        (function() {
          const btn = document.querySelector('.btn');
          if (btn) {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
          }
        })();
      `).catch(() => {});
    }
  }

  private hideHotBar() {
    if (this.edgeBar && !this.edgeBar.isDestroyed()) {
      this.edgeBar.webContents.executeJavaScript(`
        (function() {
          const btn = document.querySelector('.btn');
          if (btn) {
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
          }
        })();
      `).catch(() => {});
    }
  }

  private setupIPC() {
    // Handle toggle panel from renderer
    ipcMain.on('toggle-panel', () => {
      if (this.isPanelVisible) {
        this.slideOut();
      } else {
        this.slideIn();
      }
    });

    // Handle get panel state
    ipcMain.handle('get-panel-state', () => {
      return this.isPanelVisible;
    });

    // Handle open settings window
    ipcMain.on('open-settings', () => {
      this.openSettingsWindow();
    });
  }

  private createEdgeBar(_screenWidth: number, screenHeight: number) {
    const hotBarWidth = 10; // Thin like a scrollbar
    const hotBarHeight = 120; // Scrollbar-like height
    // Hot bar is at the RIGHT EDGE of the panel
    // When panel is open: at panel edge (right outside = panelWidth)
    // When panel is closed: at screen edge (fully visible at x=0)
    const xPosition = 0; // Start at screen left edge (fully visible)

    this.edgeBar = new BrowserWindow({
      width: hotBarWidth,
      height: hotBarHeight,
      x: xPosition,
      y: Math.floor((screenHeight - 80) / 2), // Center vertically
      frame: false,
      transparent: true, // Make it transparent
      alwaysOnTop: false, // Don't use alwaysOnTop initially
      hasShadow: false,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      focusable: false,
      show: false, // Don't show initially
      acceptFirstMouse: false, // Don't activate on click
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // CRITICAL: Set window level after creation to avoid activation
    // Use 'floating' level instead of alwaysOnTop to prevent dock activation
    this.edgeBar.setAlwaysOnTop(true, 'floating', 1);
    this.edgeBar.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.edgeBar.setIgnoreMouseEvents(false);

    // Show without activation - this is key to preventing dock icon
    this.edgeBar.showInactive();

    console.log('Hot bar initial position:', this.edgeBar.getBounds());

    // DevTools disabled for edge bar (uncomment if needed for debugging)
    // if (process.env.NODE_ENV === 'development') {
    //   this.edgeBar.webContents.openDevTools({ mode: 'detach' });
    // }
  }

  private createMainPanel(screenWidth: number, screenHeight: number) {
    const startX = this.panelPosition === 'left' ? -this.panelWidth : screenWidth;

    this.mainPanel = new BrowserWindow({
      width: this.panelWidth,
      height: screenHeight,
      x: startX,
      y: 0,
      frame: false,
      transparent: false,
      alwaysOnTop: false, // Set after creation
      hasShadow: false,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      show: false,
      acceptFirstMouse: false, // Don't activate on click
      backgroundColor: '#1e1e1e',
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // CRITICAL: Set these after window creation to avoid activation
    this.mainPanel.setAlwaysOnTop(true, 'floating', 1);
    this.mainPanel.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Load the main app
    this.mainPanel.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      this.mainPanel.webContents.openDevTools({ mode: 'detach' });
      // Suppress Autofill warnings
      this.mainPanel.webContents.on('devtools-opened', () => {
        this.mainPanel?.webContents.devToolsWebContents?.executeJavaScript(`
          console.defaultError = console.error.bind(console);
          console.error = (error, ...args) => {
            if (typeof error === 'string' && error.includes('Autofill')) return;
            console.defaultError(error, ...args);
          };
        `).catch(() => {});
      });
    }

    // Disable auto-hide on blur for now
    // Users will manually control panel via hot bar
    // this.mainPanel.on('blur', () => {
    //   this.slideOut();
    // });
  }

  private openSettingsWindow() {
    // If settings window already exists, focus it
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.focus();
      return;
    }

    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Create settings window with responsive dimensions (optimized for MacBook Air)
    const windowWidth = Math.min(700, screenWidth - 100); // Max 700px, leave 100px margin
    const windowHeight = Math.min(650, screenHeight - 100); // Max 650px, leave 100px margin

    this.settingsWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: Math.floor((screenWidth - windowWidth) / 2),
      y: Math.floor((screenHeight - windowHeight) / 2),
      minWidth: 550, // Reduced from 600 for smaller screens
      minHeight: 450, // Reduced from 500 for smaller screens
      frame: true,
      title: 'Settings',
      backgroundColor: '#1a1a1a',
      show: false,
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load the same main app (it will show settings based on URL or query param)
    this.settingsWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY + '#settings');

    // Show window when ready
    this.settingsWindow.once('ready-to-show', () => {
      this.settingsWindow?.show();
    });

    // Clean up reference when closed
    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      this.settingsWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }

  private setupEdgeBarListeners() {
    if (!this.edgeBar) return;

    // Load hot bar HTML with proper encoding
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background: transparent;
            }
            body {
              display: flex;
              align-items: center;
              justify-content: flex-start;
            }
            .btn {
              background: rgba(128,128,128,.4);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              border: none;
              border-radius: 999px;
              padding: 0;
              cursor: pointer;
              box-shadow: 0 1px 3px rgba(0,0,0,.15);
              transition: opacity .2s ease, background .2s ease, box-shadow .2s ease, transform .1s ease;
              margin: 0;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 1;
              pointer-events: auto;
            }
            .btn:hover {
              background: rgba(160,160,160,.75);
              box-shadow: 0 2px 6px rgba(0,0,0,.25);
            }
            .btn:active {
              transform: scale(.92);
              background: rgba(180,180,180,.85);
            }
          </style>
        </head>
        <body>
          <button class="btn" onclick="require('electron').ipcRenderer.send('toggle-panel')"></button>
        </body>
      </html>
    `;

    this.edgeBar.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  }

  private registerShortcuts() {
    // Register CMD+Shift+S (or Ctrl+Shift+S on Windows/Linux) to toggle panel
    const toggleShortcut = process.platform === 'darwin' ? 'Command+Shift+S' : 'Ctrl+Shift+S';

    globalShortcut.register(toggleShortcut, () => {
      if (this.isPanelVisible) {
        this.slideOut();
      } else {
        this.slideIn();
      }
    });

    // Register CMD+F (or Ctrl+F on Windows/Linux) to open search
    const searchShortcut = process.platform === 'darwin' ? 'Command+F' : 'Ctrl+F';

    globalShortcut.register(searchShortcut, () => {
      // If panel is hidden, show it first
      if (!this.isPanelVisible) {
        this.slideIn();
      }

      // Send event to renderer to open search
      if (this.mainPanel) {
        this.mainPanel.webContents.send('open-search');
      }
    });
  }

  slideIn() {
    if (!this.mainPanel || this.isAnimating || this.isPanelVisible) {
      console.log('slideIn blocked:', {
        hasPanel: !!this.mainPanel,
        isAnimating: this.isAnimating,
        isPanelVisible: this.isPanelVisible
      });
      return;
    }

    console.log('Starting slideIn');
    this.isAnimating = true;
    // Use showInactive to prevent activation and dock icon appearance
    this.mainPanel.showInactive();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const targetX = this.panelPosition === 'left' ? 0 : screenWidth - this.panelWidth;
    const startX = this.panelPosition === 'left' ? -this.panelWidth : screenWidth;

    this.animatePanel(startX, targetX, () => {
      this.isAnimating = false;
      this.isPanelVisible = true;
      // Don't call focus() as it can activate the app and show dock icon
      // this.mainPanel?.focus();

      // Move hot bar to the right edge of the panel (wherever it is)
      if (this.edgeBar && !this.edgeBar.isDestroyed() && this.mainPanel && !this.mainPanel.isDestroyed()) {
        const panelBounds = this.mainPanel.getBounds();
        // Position hot bar at the right edge of the panel (panelX + panelWidth)
        const hotBarX = panelBounds.x + panelBounds.width;
        const hotBarY = Math.floor((screenHeight - 80) / 2);
        console.log('Panel bounds:', panelBounds);
        console.log('Moving hot bar to:', { x: hotBarX, y: hotBarY });
        this.edgeBar.setPosition(hotBarX, hotBarY);
        console.log('Hot bar position after move:', this.edgeBar.getBounds());
      }
    });
  }

  slideOut() {
    if (!this.mainPanel || this.isAnimating || !this.isPanelVisible) {
      console.log('slideOut blocked:', {
        hasPanel: !!this.mainPanel,
        isAnimating: this.isAnimating,
        isPanelVisible: this.isPanelVisible
      });
      return;
    }

    console.log('Starting slideOut');
    this.isAnimating = true;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const startX = this.panelPosition === 'left' ? 0 : screenWidth - this.panelWidth;
    const targetX = this.panelPosition === 'left' ? -this.panelWidth : screenWidth;

    // Move hot bar to screen left edge when panel is hidden
    if (this.edgeBar && !this.edgeBar.isDestroyed()) {
      // Position hot bar at screen left edge (fully visible at x=0)
      this.edgeBar.setPosition(0, Math.floor((screenHeight - 80) / 2));
      console.log('Hot bar moved to screen edge:', this.edgeBar.getBounds());
    }

    this.animatePanel(startX, targetX, () => {
      this.isAnimating = false;
      this.isPanelVisible = false;
    }, true); // Pass true to indicate this is a close animation
  }

  private animatePanel(startX: number, targetX: number, onComplete: () => void, isClosing: boolean = false) {
    const duration = 200; // milliseconds
    const fps = 60;
    const frames = (duration / 1000) * fps;
    let currentFrame = 0;

    const interval = setInterval(() => {
      // Check if window still exists and is not destroyed
      if (!this.mainPanel || this.mainPanel.isDestroyed()) {
        clearInterval(interval);
        return;
      }

      currentFrame++;

      // If closing, hide panel just before the last frame to prevent glitch
      if (isClosing && currentFrame >= frames - 1) {
        if (this.mainPanel && !this.mainPanel.isDestroyed()) {
          this.mainPanel.hide();
        }
      }

      if (currentFrame >= frames) {
        // Ensure final position is exactly at target (no rounding errors)
        const finalX = Math.round(targetX);
        if (this.mainPanel && !this.mainPanel.isDestroyed() && Number.isFinite(finalX)) {
          try {
            this.mainPanel.setPosition(finalX, 0);
          } catch (error) {
            console.error('Error setting final position:', error);
          }
        }
        clearInterval(interval);
        // Call completion immediately without delay
        onComplete();
      } else {
        // Apply easing (ease-out cubic for smooth deceleration)
        const progress = currentFrame / frames;
        const eased = 1 - Math.pow(1 - progress, 3);
        const easedX = startX + (targetX - startX) * eased;
        const roundedX = Math.round(easedX);

        if (this.mainPanel && !this.mainPanel.isDestroyed() && Number.isFinite(roundedX)) {
          try {
            this.mainPanel.setPosition(roundedX, 0);
          } catch (error) {
            // Silently ignore position errors during animation
          }
        }
      }
    }, 1000 / fps);
  }

  destroy() {
    // Unregister all shortcuts
    globalShortcut.unregisterAll();

    // Clear intervals and timeouts
    if (this.mouseTrackingInterval) {
      clearInterval(this.mouseTrackingInterval);
      this.mouseTrackingInterval = null;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Destroy tray icon
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
    }

    // Close windows safely
    if (this.edgeBar && !this.edgeBar.isDestroyed()) {
      this.edgeBar.close();
    }
    if (this.mainPanel && !this.mainPanel.isDestroyed()) {
      this.mainPanel.close();
    }

    // Clear references
    this.tray = null;
    this.edgeBar = null;
    this.mainPanel = null;
  }
}

let windowManager: WindowManager | null = null;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Use 'accessory' activation policy - works better with visible windows
  // Combined with LSUIElement: 1 in Info.plist to hide from dock
  // 'prohibited' can cause issues with window visibility
  if (process.platform === 'darwin') {
    app.setActivationPolicy('accessory');
  }

  // Register IPC handlers for filesystem operations
  registerFilesystemHandlers();

  // Register IPC handlers for git operations
  registerGitHandlers();

  // Register IPC handlers for finance operations
  registerFinanceHandlers();

  windowManager = new WindowManager('left');
  windowManager.createWindows();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager = new WindowManager('left');
      windowManager.createWindows();
    }
  });
});

// Don't quit when all windows are closed - keep running in menu bar
app.on('window-all-closed', () => {
  // Do nothing - keep app running as background utility
  // On macOS, apps typically continue running without windows
  // App should only quit when user selects "Quit" from tray menu
  console.log('Windows closed but app continues running in background');
});

// Allow CMD+Q to quit the app
app.on('before-quit', () => {
  console.log('App quitting via CMD+Q or tray menu');
});

// Handle cleanup when actually quitting
app.on('will-quit', () => {
  console.log('App quitting - cleaning up...');
  windowManager?.destroy();
});
