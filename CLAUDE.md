# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ZenSide** is a macOS side panel application combining two apps:
- **ZenNote**: Markdown-based note-taking with Git sync
- **ZenCash**: Personal finance tracking with multiple pockets

Built with Electron + React + TypeScript, it runs as a menu bar utility with a hot bar for quick access from screen edge.

## Development Commands

```bash
# Development
npm start                    # Start app with hot reload + DevTools

# Building
npm run package              # Package without code signing
npm run package:fast         # Package fast (skip code signing)
npm run make                 # Create DMG installer
npm run make:fast            # Create DMG fast (skip code signing)

# Production (requires Apple Developer credentials in .env)
./build-release.sh          # Build, sign, and notarize for distribution
```

## Architecture Overview

### Electron IPC Architecture

The app uses a **strict IPC bridge** via [preload.js](src/preload.js) that exposes the `window.electronAPI` object to the renderer. All main-renderer communication flows through this bridge.

**IPC Handlers are organized by domain:**
- [src/main/fs-handlers.ts](src/main/fs-handlers.ts) - Filesystem operations
- [src/main/git-handlers.ts](src/main/git-handlers.ts) - Git operations
- [src/main/finance-handlers.ts](src/main/finance-handlers.ts) - Finance operations

All handlers are registered in [main.ts](src/main.ts) during app initialization.

### Service Layer Pattern

Three core services handle all data operations and are instantiated in main process:

1. **FilesystemSync** ([services/filesystemSync.ts](src/services/filesystemSync.ts))
   - Manages sync directory configuration via electron-store
   - Saves notes as `.md` files with frontmatter metadata
   - Saves folders as `folders.json`
   - Uses chokidar for file watching and real-time sync
   - Handles bidirectional sync (app ↔ filesystem)

2. **GitService** ([services/git.ts](src/services/git.ts))
   - Wraps simple-git library for Git operations
   - Initialized with sync directory path
   - Handles commits, history, status, remotes
   - Supports both SSH and HTTPS authentication

3. **FinanceService** ([services/finance.ts](src/services/finance.ts))
   - Stores data in `finance/` subdirectory of sync folder
   - Uses monthly transaction files: `transactions/YYYY-MM.json`
   - Maintains separate files for pockets and categories
   - Caches summary data for performance

### Window Management

[main.ts](src/main.ts) implements a `WindowManager` class that controls:
- **Edge bar**: Invisible trigger zone at screen edge
- **Main panel**: Sliding panel window (384px width)
- **Settings window**: Separate window for configuration
- **Tray**: Menu bar icon and menu

The panel slides in/out with smooth animations and supports both left/right positioning.

### Data Flow

```
User Action → React Component → Hook → IPC Call (preload.js)
   ↓
Main Process Handler → Service → Filesystem/Git
   ↓
IPC Response → Hook Updates State → React Re-renders
```

**File watching enables reverse flow:**
```
External File Change → Chokidar Event → IPC Event to Renderer
   ↓
Hook Listens → Reloads Data → React Re-renders
```

### State Management

No Redux/Context - uses **React hooks** and **local state**:
- [hooks/useSyncDirectory.ts](src/hooks/useSyncDirectory.ts) - Manages notes/folders sync
- [hooks/useGit.ts](src/hooks/useGit.ts) - Git operations and status
- [hooks/useFinance.ts](src/hooks/useFinance.ts) - Finance data and operations
- [hooks/useSearch.ts](src/hooks/useSearch.ts) - Search functionality
- [hooks/useAutoSync.ts](src/hooks/useAutoSync.ts) - Auto git sync

### Notes Data Model

Notes use **frontmatter** for metadata ([utils/frontmatter.ts](src/utils/frontmatter.ts)):

```markdown
---
id: uuid-here
type: markdown
color: "#FF6B6B"
folderId: parent-folder-id
createdAt: 2025-11-08T10:00:00.000Z
updatedAt: 2025-11-08T10:30:00.000Z
order: 42
---

# Note Title

Note content here...
```

**Key fields:**
- `order`: Higher numbers appear first (newest at top)
- `folderId`: Links note to parent folder
- `isDirty`: Runtime flag indicating unsaved changes (not persisted)

**Title extraction:** First line of content becomes the title via `extractTitle()` utility. There is no separate title field.

### Finance Data Model

Stored in `finance/` subdirectory:
- `pockets.json` - Account balances and metadata
- `categories.json` - Income/expense categories
- `transactions/YYYY-MM.json` - Monthly transaction files
- `summary.json` - Cached monthly statistics

**Transaction types:**
- `income`: Adds to pocket (requires `pocketId`, `categoryId`)
- `expense`: Deducts from pocket (requires `pocketId`, `categoryId`)
- `transfer`: Moves between pockets (requires `fromPocketId`, `toPocketId`)

Default categories are defined in [constants/financeDefaults.ts](src/constants/financeDefaults.ts).

## Code Signing and Distribution

For macOS distribution, you need:
1. Apple Developer Account ($99/year)
2. Developer ID Application Certificate
3. App-specific password for notarization

Configure in `.env`:
```bash
APPLE_ID=your@email.com
APPLE_ID_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_IDENTITY="Developer ID Application: Your Name (TEAMID)"
```

The [forge.config.js](forge.config.js) handles code signing configuration. The `LSUIElement: 1` setting hides the app from Dock.

## Key Behaviors

### Panel Visibility
- Panel hidden by default on launch
- Triggered by: tray icon click, `Cmd+Shift+S`, or edge bar hover
- Auto-hides when clicking outside or pressing escape
- State persists across app restarts

### Hot Bar
- Invisible edge bar at screen edge (default: left)
- Auto-hides after 3 seconds of mouse inactivity
- Configurable position (left/right) and width in Settings

### Sync Directory
- Must be set before using the app
- Stores all data as plain text files for transparency
- App reloads automatically when sync directory changes
- Files are human-readable and Git-friendly

### Git Integration
- Automatically initializes Git repo if not present
- Manual commit workflow (no auto-commit)
- Supports auto-sync with configurable intervals
- Handles both authenticated and unauthenticated repos

### Power Management
- Handles macOS sleep/wake events
- Restores windows after sleep (see `setupPowerMonitor()`)
- Uses powerMonitor API to detect suspend/resume

## TypeScript Types

All types are defined in [src/types/](src/types/):
- [note.ts](src/types/note.ts) - Note, Folder, AppSettings
- [finance.ts](src/types/finance.ts) - Transaction, Pocket, Category
- [electron.d.ts](src/types/electron.d.ts) - Window API augmentation

## App Modes

The main app switches between two modes via `appMode` state in [App.tsx](src/App.tsx):
- `notes` - Shows ZenNote interface
- `finance` - Shows ZenCash interface

Mode is persisted to localStorage and survives app restarts.

## Common Patterns

### Adding a new IPC handler
1. Define handler in appropriate file ([fs-handlers.ts](src/main/fs-handlers.ts), [git-handlers.ts](src/main/git-handlers.ts), etc.)
2. Add method to `electronAPI` in [preload.js](src/preload.js)
3. Add TypeScript type to [electron.d.ts](src/types/electron.d.ts)
4. Call from React via `window.electronAPI.methodName()`

### Adding a new finance feature
1. Update types in [types/finance.ts](src/types/finance.ts)
2. Add service method in [services/finance.ts](src/services/finance.ts)
3. Add IPC handler in [main/finance-handlers.ts](src/main/finance-handlers.ts)
4. Update hook in [hooks/useFinance.ts](src/hooks/useFinance.ts)
5. Update UI in [components/finance/](src/components/finance/)

### Adding a new Git operation
1. Add method to GitService in [services/git.ts](src/services/git.ts)
2. Add IPC handler in [main/git-handlers.ts](src/main/git-handlers.ts)
3. Expose in [preload.js](src/preload.js)
4. Use in hook [hooks/useGit.ts](src/hooks/useGit.ts)
5. Call from component

## Important Constraints

- **macOS only**: Uses macOS-specific APIs (screen tracking, tray, accessibility)
- **No automated tests**: Currently relies on manual testing
- **No linting**: Project has no linting configured (`npm run lint` is a no-op)
- **Sync directory required**: App won't function without selecting sync directory first
- **Git is optional**: App works without Git, but git features will be disabled
- **Single window architecture**: Only one main panel window exists at a time

## File Naming Conventions

- Components: PascalCase (e.g., `NoteEditor.tsx`)
- Services: camelCase (e.g., `filesystemSync.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useSyncDirectory.ts`)
- Utils: camelCase (e.g., `noteUtils.ts`)
- Types: camelCase (e.g., `finance.ts`)
- CSS: kebab-case matching component (e.g., `git-menu.css`)
