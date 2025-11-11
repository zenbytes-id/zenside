# Changelog

All notable changes to ZenSide will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Panel visibility toggle in Settings → General to control whether panel shows on app startup
- Configurable global keyboard shortcut to toggle panel show/hide
- 9 predefined keyboard shortcut options (Cmd+Shift+S/N/P, Cmd+Alt+N/S, F9-F12)
- Settings stored persistently using electron-store
- Expanded emoji icon library from 24 to 72 icons for both pockets and categories
- 10 categorized icon themes: Money & Finance, Food & Drink, Transportation, Shopping & Items, Entertainment & Hobbies, Work & Study, Home & Living, Health & Wellness, Goals & Planning, and Miscellaneous
- Balance visibility toggle in ZenCash to hide/show sensitive financial information
- Eye icon button to toggle visibility of Total Balance, Monthly Income, Monthly Expense, and Pocket balances
- Persistent balance visibility preference saved to localStorage across app sessions
- "About ZenSide" menu item in tray menu with app logo and comprehensive information

### Changed
- Improved folder hover interaction in ZenNote with smooth slide animation - count shifts left and delete button appears in its place
- Optimized folder item layout to be more compact with tighter spacing on the right edge
- Simplified folder hover effect in ZenNote to only show highlight without pop/resize animation
- All keyboard shortcuts are now disabled by default and must be enabled in Settings
- Removed hardcoded Cmd+F and Cmd+Shift+S shortcuts
- Icon picker now uses 6-column grid layout with vertical scrolling for better organization
- Category Manager now shares the same comprehensive icon library as pocket icons
- Balance values in ZenCash now display as '••••••' when hidden for improved privacy
- Enhanced Git toast notifications with floating effect, layered shadows, and backdrop blur
- Toast animations now include scale transform for more dynamic entrance
- Toast backgrounds upgraded to gradient styles with color-specific glowing shadows
- "About ZenSide" dialog now dynamically shows version from package.json
- Keyboard shortcut information in "About ZenSide" now reflects actual configured shortcut or shows "Disabled" status

### Fixed
- Critical: Git auto-sync now correctly pushes unpushed commits even when there are no uncommitted changes
- Auto-sync and manual "Sync Now" button now properly detect and push commits that are ahead of remote
- Icon picker in Create New Pocket dialog no longer overflows card boundaries
- Icon picker in Category Manager properly displays all icons with scrollable container
- Critical: App no longer crashes after macOS sleep/wake or screen lock/unlock events
- Panel window now properly restores after system resume with correct visibility state
- Hot bar continues to function correctly after laptop lid close/open cycles
- Mouse tracking automatically restarts if interrupted by power management events
- Window restoration now waits for webContents to load before showing panel
- Added safety checks for destroyed webContents to prevent JavaScript execution errors

### Removed
- Global keyboard shortcuts (Cmd+Shift+S to toggle, Cmd+F for search) - now opt-in via Settings

## [1.0.2] - 2025-11-08

### Changed
- Panel now opens automatically on app startup for immediate access
- Transaction list footer now sticks to bottom of panel above git menu for better visibility
- Improved scrolling behavior in ZenCash transaction history

### Fixed
- Critical: File watcher now sends events to all valid windows instead of potentially destroyed window references, preventing "Object has been destroyed" crash when creating new notes

## [1.0.1] - 2025-11-07

### Added
- "Clear Sync Directory" button in Settings to reset sync configuration without deleting files
- Empty state message prompting users to select sync directory when none is configured
- Better event handling for sync directory changes with automatic app reload
- `.gitkeep` files automatically created in empty folders to ensure Git tracking

### Changed
- Improved sync directory initialization flow - app now reloads automatically when directory is changed
- Settings window now closes after sync directory selection instead of reloading
- Enhanced empty state UI with better guidance for first-time users
- Refactored folder view to show appropriate empty states based on sync status

### Fixed
- Sync state now properly checks both `enabled` and `directory` properties
- App now clears notes and folders when sync directory is removed
- IPC event listeners properly registered for sync directory changes
- Settings window behavior improved to prevent multiple reloads

## [1.0.0] - 2025-11-07

### Initial Public Release

ZenSide is a dual-purpose macOS side panel application combining note-taking (ZenNote) and personal finance tracking (ZenCash).

#### Note-Taking Features (ZenNote)
- Quick access side panel that slides from screen edge
- Global keyboard shortcuts (Cmd+Shift+S to toggle, Cmd+F for search)
- Markdown WYSIWYG editor with live preview
- Folder organization with nested folder support
- Full-text search across all notes
- Filesystem sync with local markdown files
- Git integration for version control
- Color-coded folders and notes
- Search history with recent searches

#### Personal Finance Features (ZenCash)
- Multiple pockets (accounts) for money management
- Track income, expenses, and transfers between pockets
- Customizable categories with emoji icons and colors
- 10 default categories (6 expense + 4 income)
- Monthly summaries and balance tracking
- Transaction history with filtering
- Expense charts and visualizations
- JSON-based storage with filesystem sync

#### Git Integration
- Commit changes directly from the app
- View commit history
- Check repository status
- Support for both SSH and HTTPS remotes
- Auto-sync functionality with configurable intervals

#### General Features
- Runs as menu bar utility (no dock icon)
- Hot bar for quick access from screen edge
- Responsive design for all MacBook sizes
- Smooth sliding animations
- Settings panel for configuration
- Sync directory selection for data storage
- Auto-hide hot bar after inactivity
- Power management support (resume after sleep)

#### Technical
- Built with Electron + React + TypeScript
- Uses simple-git for Git operations
- Chokidar for file watching
- Marked + Turndown for markdown processing
- Electron Forge for packaging and distribution
- Code signing and notarization support for macOS

[Unreleased]: https://github.com/zenbytes-id/zenside/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/zenbytes-id/zenside/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/zenbytes-id/zenside/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/zenbytes-id/zenside/releases/tag/v1.0.0
