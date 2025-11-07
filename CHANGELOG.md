# Changelog

All notable changes to ZenSide will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/zenbytes-id/zenside/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/zenbytes-id/zenside/releases/tag/v1.0.0
