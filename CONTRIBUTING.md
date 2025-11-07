# Contributing to ZenSide

Thank you for your interest in contributing to ZenSide! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

- macOS 10.15 or later
- Node.js 16+ and npm
- Git

### Setting Up Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/zenside.git
   cd zenside
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm start
   ```

The app will launch with hot reload enabled. DevTools will open automatically for debugging.

## Project Structure

```
src/
├── main.ts                 # Electron main process
├── renderer.tsx            # React entry point
├── App.tsx                 # Main React component
├── components/             # React components
├── services/               # Core services (filesystem, git, finance)
├── hooks/                  # Custom React hooks
├── utils/                  # Utility functions
└── types/                  # TypeScript type definitions
```

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Update types as needed

3. **Test your changes**
   - Test manually with `npm start`
   - Test all related features
   - Test on different macOS versions if possible

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add feature: description of your changes"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Describe your changes clearly

### Code Style Guidelines

- **TypeScript**: Use strict typing, avoid `any` when possible
- **React**: Use functional components with hooks
- **Naming**: Use camelCase for variables/functions, PascalCase for components
- **Comments**: Add JSDoc comments for public functions
- **File Organization**: Keep files focused and under 500 lines when possible

### Commit Message Guidelines

Follow the conventional commits format:

```
type(scope): brief description

Longer description if needed

- Bullet points for details
- Multiple lines are fine
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(finance): add category filtering for transactions
fix(git): handle authentication errors gracefully
docs(readme): update installation instructions
```

## Building and Packaging

### Development Build
```bash
npm run package
```

### Production Build with Code Signing

For macOS code signing and notarization, you'll need:

1. **Apple Developer Account** ($99/year)
2. **Developer ID Application Certificate**
3. **App-specific password** for notarization

See [docs/APPLE_CODE_SIGNING.md](docs/APPLE_CODE_SIGNING.md) for detailed setup instructions.

**Configure credentials:**
```bash
cp .env.example .env
# Edit .env with your Apple Developer credentials
```

**Build and sign:**
```bash
./build-release.sh
```

This will create signed and notarized `.dmg` and `.zip` files in `out/make/`.

### Quick Build (No Code Signing)

For faster testing without code signing:
```bash
npm run package:fast
npm run make:fast
```

## Testing

Currently, ZenSide uses manual testing. Automated testing contributions are welcome!

**Areas to test:**
- Note creation, editing, deletion
- Folder management and navigation
- Markdown rendering
- Git operations (commit, history, status)
- Finance tracking (pockets, transactions, categories)
- Settings and sync directory management
- Search functionality
- Keyboard shortcuts

## Submitting Issues

### Bug Reports

When reporting bugs, please include:

- **macOS version**
- **ZenSide version** (found in Settings)
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Console logs** (open DevTools with Cmd+Option+I)

### Feature Requests

When requesting features, please include:

- **Use case**: Why is this feature needed?
- **Proposed solution**: How should it work?
- **Alternatives**: Have you considered other approaches?
- **Additional context**: Screenshots, mockups, examples

## Areas for Contribution

Here are some areas where contributions are particularly welcome:

### High Priority
- Automated testing (unit tests, integration tests)
- Performance optimizations
- Bug fixes
- Documentation improvements

### Features
- Export/import functionality
- Advanced search features
- Backup and restore
- Customizable themes
- Windows/Linux support (requires significant refactoring)

### Nice to Have
- Monaco editor integration for code notes
- Calendar view for finance tracking
- Budget planning features
- Recurring transactions
- Data visualization improvements

## Questions?

If you have questions about contributing, feel free to:

- Open an issue with the question label
- Email: dev@zenbytes.id
- Check existing issues and pull requests

## License

By contributing to ZenSide, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

Be respectful, inclusive, and professional. We're all here to build something great together.

---

Thank you for contributing to ZenSide!