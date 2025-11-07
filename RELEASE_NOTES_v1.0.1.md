# ZenSide v1.0.1 Release Notes

**Release Date:** November 7, 2025

## Overview

This is a maintenance release that improves the sync directory management experience and fixes several user experience issues related to initial setup and configuration changes.

## What's New

### Sync Directory Management

- **Clear Sync Directory Button**: Added a new "Clear Sync Directory" button in Settings that allows users to reset their sync configuration without deleting any files. This is useful when you want to reconfigure the app or start fresh with a different directory.

- **Improved First-Time Experience**: When no sync directory is configured, the app now displays a helpful empty state with a direct link to open Settings, making it clearer what action users need to take.

- **Automatic Git Tracking**: Empty folders now automatically receive a `.gitkeep` file to ensure they're tracked by Git, even when they contain no notes yet.

### Enhanced User Experience

- **Smoother Directory Changes**: When you change or clear the sync directory, the app now automatically reloads to ensure all components are properly synchronized with the new configuration.

- **Better Empty States**: The folder view now shows context-appropriate messages based on whether you have no sync directory configured, or whether a folder is simply empty.

- **Settings Window Improvements**: The Settings window now closes automatically after selecting a sync directory, providing a cleaner workflow.

## Bug Fixes

- Fixed sync state validation to properly check both the `enabled` flag and `directory` path
- Fixed issue where notes and folders weren't being cleared when sync directory was removed
- Improved IPC event listener registration for sync directory change events
- Prevented multiple unnecessary reloads when changing settings

## Technical Changes

### Modified Files
- `src/App.tsx` - Enhanced sync state handling and event listeners
- `src/components/Settings.tsx` - Added clear sync directory functionality
- `src/main/fs-handlers.ts` - Improved IPC event broadcasting
- `src/services/filesystemSync.ts` - Added .gitkeep file creation
- `src/components/finance/` - Minor refinements to finance components
- `src/types/electron.d.ts` - Updated type definitions for new IPC events

## Upgrade Notes

This is a patch release and can be installed directly over v1.0.0. No migration or data changes are required. Your existing sync directory and all notes will remain intact.

## Installation

### macOS
1. Download the DMG file from the releases page
2. Open the DMG and drag ZenSide to your Applications folder
3. Launch ZenSide from Applications

## Known Issues

None at this time. If you encounter any issues, please report them on our [GitHub Issues page](https://github.com/zenbytes-id/zenside/issues).

## What's Next

We're continuously improving ZenSide. Upcoming features in consideration:
- Enhanced search capabilities
- Custom themes and appearance options
- Export/import functionality
- Cross-device sync improvements

## Feedback

We love hearing from our users! If you have suggestions or feedback:
- Open an issue: https://github.com/zenbytes-id/zenside/issues
- Visit our website: https://zenside.zenapps.cloud

## Contributors

Thank you to everyone who reported issues and provided feedback that helped make this release better.

---

**Full Changelog**: https://github.com/zenbytes-id/zenside/compare/v1.0.0...v1.0.1
