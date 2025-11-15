# Changelog

All notable changes to ZenSide will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Category dropdown in Add Transaction dialog now updates automatically when categories are modified in Settings
- Category changes in Settings are now immediately reflected across all ZenCash components without requiring app restart
- Git menu now appears immediately after initial Git setup without requiring app restart
- Auto-sync toggle in Settings now properly enables after publishing repository to remote
- Git status correctly shows "Not published" when repository has commits but hasn't been pushed to remote yet
- Settings window now properly detects published repository status when opened after first push
- First-install protection prevents creating notes/folders before sync directory is selected

## [1.1.0] - 2025-11-14

### Added
- **Bills/Tagihan** - Monthly recurring payment tracking in ZenCash
- Create bills with custom name, amount, category, and deadline date (1-31)
- Payment status tracking with floating badges (paid, overdue, upcoming, today)
- Countdown warnings for bills approaching deadline (shows days remaining in compact format: "3d", "-2d")
- Overdue alerts for unpaid bills past deadline date with negative day counter
- Horizontal scrollable bill list UI matching pockets design for consistency
- Total bills amount display in header to see monthly obligations at a glance
- Pay bill action that creates expense transaction and links to bill payment record
- Edit bill details including amount, category, deadline, icon, and color
- Drag-and-drop reordering of bills in manage bills dialog
- Bill payment history tracking linked to transactions
- Compact inline empty state for bills section
- Bill icons and colors customization (72 emoji icons, 8 colors)
- Bills stored in `finance/bills.json` with payment records
- Git integration with auto-commit for bill operations

### Changed
- ZenCash transaction search UI/UX improved with collapsible search bar
- Search icon moved to Recent Transactions header for better contextual placement
- Search bar now hidden by default and expands with smooth slide-down animation when search icon is clicked
- Search bar collapses with smooth slide-up animation when search icon is clicked again
- Improved visual hierarchy by placing search functionality directly next to transaction list
- Bills section positioned between Pockets and Recent Transactions for better workflow
- Bill empty state uses single-line layout with inline "Add Bill" button
- Bill cards redesigned with vertical layout to prevent text wrapping
- Bill status badges now float in top-right corner with semi-transparent colored backgrounds
- Bill card width fixed at 200px for consistent horizontal scrolling
- Bill status text simplified with abbreviations (e.g., "3d" instead of "3 days left") with full text in tooltips

### Fixed
- Git integration in ZenCash now correctly updates status when transactions are added, updated, or deleted
- Git status indicator now properly shows uncommitted changes after pocket operations (add, update, reorder)
- Finance file changes now trigger git status refresh consistently with ZenNote behavior

## [1.0.4] - 2025-11-12

### Added
- Opening balance support for pockets in ZenCash
- Optional opening balance field when creating new pockets
- Ability to edit opening balance for existing pockets
- Opening balance date tracking to record when balance was set
- Rupiah formatting for opening balance input fields with auto-formatting as user types
- Balance calculation now includes opening balance (Opening Balance + Total Income - Total Expense + Net Transfers)

### Changed
- Expense Analysis modal: Category breakdown now displays in 2-line format with category name on first line and amount + percentage on second line
- Expense Analysis modal: Reduced category breakdown max height from 400px to 300px for better visibility
- Expense Analysis modal: Total Expenses amount now stays on single line without awkward wrapping
- Pocket balance calculation now starts from opening balance (if set) instead of always starting from zero
- Opening balance input uses consistent Rupiah formatting (Rp 1.000.000) matching transaction amount fields

### Fixed
- Critical: Panel now stays on current desktop when opened instead of switching to different desktop
- Fixed multi-desktop support to prevent automatic workspace switching when showing panel
- App now correctly respects macOS workspace boundaries without forcing desktop changes
- Expense Analysis modal: Fixed text wrapper bug in Total Expenses card
- Expense Analysis modal: Category breakdown is now properly scrollable with improved layout

## [1.0.3] - 2025-11-11

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

[Unreleased]: https://github.com/zenbytes-id/zenside/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/zenbytes-id/zenside/compare/v1.0.4...v1.1.0
[1.0.4]: https://github.com/zenbytes-id/zenside/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/zenbytes-id/zenside/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/zenbytes-id/zenside/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/zenbytes-id/zenside/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/zenbytes-id/zenside/releases/tag/v1.0.0
