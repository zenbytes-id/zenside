import React, { useState, useEffect } from 'react';
import { useGit } from '../hooks/useGit';
import { CategoryManager } from './CategoryManager';
import '../styles/settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SyncStatus {
  enabled: boolean;
  directory: string | null;
  status: 'synced' | 'syncing' | 'error' | 'disabled';
  lastSync?: Date;
  message?: string;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'filesystem' | 'git' | 'general' | 'appearance'>('filesystem');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    enabled: false,
    directory: null,
    status: 'disabled'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState(60); // seconds
  const [hideAutoSyncFiles, setHideAutoSyncFiles] = useState(true); // Hide auto-sync files by default

  // Git-related states
  const git = useGit(syncStatus.directory);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAddingRemote, setIsAddingRemote] = useState(false);
  const [isRemovingRemote, setIsRemovingRemote] = useState(false);
  const [isUpdatingRemote, setIsUpdatingRemote] = useState(false);
  const [editingRemote, setEditingRemote] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [gitMessage, setGitMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [hasCommits, setHasCommits] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showSSHHelp, setShowSSHHelp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSyncStatus();
      loadAutoSyncSettings();
    }
  }, [isOpen]);

  // Load git data when repository becomes available
  useEffect(() => {
    const loadGitData = async () => {
      if (git.isRepository) {
        await git.refreshRemotes();

        // Check if there are any commits
        try {
          const log = await git.getLog(1);
          setHasCommits(log.total > 0);
        } catch (error) {
          setHasCommits(false);
        }
      }
    };
    loadGitData();
  }, [git.isRepository]);

  // Load existing remote URL
  useEffect(() => {
    if (git.remotes.length > 0) {
      const origin = git.remotes.find(r => r.name === 'origin');
      if (origin) {
        setRemoteUrl(origin.refs.fetch);
      }
    }
  }, [git.remotes]);

  const loadAutoSyncSettings = () => {
    const savedAutoSync = localStorage.getItem('git-auto-sync-enabled');
    const savedInterval = localStorage.getItem('git-auto-sync-interval');
    const savedHideFiles = localStorage.getItem('git-auto-sync-hide-files');

    if (savedAutoSync !== null) {
      setAutoSyncEnabled(savedAutoSync === 'true');
    }
    if (savedInterval !== null) {
      setAutoSyncInterval(parseInt(savedInterval, 10));
    }
    if (savedHideFiles !== null) {
      setHideAutoSyncFiles(savedHideFiles === 'true');
    } else {
      // Default to hiding auto-sync files
      setHideAutoSyncFiles(true);
      localStorage.setItem('git-auto-sync-hide-files', 'true');
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem('git-auto-sync-enabled', enabled.toString());

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('git:auto-sync-changed', {
      detail: { enabled, interval: autoSyncInterval }
    }));
  };

  const handleIntervalChange = (interval: number) => {
    setAutoSyncInterval(interval);
    localStorage.setItem('git-auto-sync-interval', interval.toString());

    // Dispatch event to notify other components
    if (autoSyncEnabled) {
      window.dispatchEvent(new CustomEvent('git:auto-sync-changed', {
        detail: { enabled: autoSyncEnabled, interval }
      }));
    }
  };

  const handleToggleHideAutoSyncFiles = (hide: boolean) => {
    setHideAutoSyncFiles(hide);
    localStorage.setItem('git-auto-sync-hide-files', hide.toString());

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('git:hide-files-changed', {
      detail: { hide }
    }));
  };

  const loadSyncStatus = async () => {
    if (!window.electronAPI?.fs) return;

    try {
      const [directory, enabled] = await Promise.all([
        window.electronAPI.fs.getSyncDirectory(),
        window.electronAPI.fs.isSyncEnabled()
      ]);

      setSyncStatus({
        enabled: enabled || false,
        directory: directory || null,
        status: enabled ? 'synced' : 'disabled'
      });
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleSelectDirectory = async () => {
    if (!window.electronAPI?.fs) return;

    setIsLoading(true);

    // Small delay to ensure the button click animation completes
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const selectedPath = await window.electronAPI.fs.selectDirectory();

      if (selectedPath) {
        const result = await window.electronAPI.fs.setSyncDirectory(selectedPath);

        if (result.success) {
          setSyncStatus({
            enabled: true,
            directory: selectedPath,
            status: 'synced',
            lastSync: new Date()
          });

          // Start watching for changes
          await window.electronAPI.fs.watchChanges();

          // Reload notes from filesystem
          await loadNotesFromFilesystem();

          // Reload the app to ensure sync state is properly initialized
          window.location.reload();
        } else {
          setSyncStatus(prev => ({
            ...prev,
            status: 'error',
            message: result.error || 'Failed to set sync directory'
          }));
        }
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
      setSyncStatus(prev => ({
        ...prev,
        status: 'error',
        message: 'Failed to select sync directory'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotesFromFilesystem = async () => {
    if (!window.electronAPI?.fs) return;

    try {
      const result = await window.electronAPI.fs.loadNotes();
      if (result.success && result.notes) {
        // Dispatch event to reload notes in the app
        window.dispatchEvent(new CustomEvent('sync:notesLoaded', {
          detail: { notes: result.notes }
        }));
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const handleOpenFolder = async () => {
    if (!window.electronAPI?.fs) return;
    await window.electronAPI.fs.openSyncFolder();
  };

  const handleDisableSync = async () => {
    if (!window.electronAPI?.fs) return;

    try {
      await window.electronAPI.fs.stopWatching();
      setSyncStatus({
        enabled: false,
        directory: syncStatus.directory,
        status: 'disabled'
      });
    } catch (error) {
      console.error('Failed to disable sync:', error);
    }
  };

  // Git handler functions
  const handleInitGit = async () => {
    try {
      setIsInitializing(true);
      setGitMessage(null);
      await git.init();
      await git.refreshStatus();
      setGitMessage({ text: 'Git repository initialized successfully!', type: 'success' });
    } catch (error) {
      setGitMessage({
        text: error instanceof Error ? error.message : 'Failed to initialize repository',
        type: 'error',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAddRemote = async () => {
    if (!remoteUrl.trim()) {
      setGitMessage({ text: 'Please enter a remote URL', type: 'error' });
      return;
    }

    try {
      setIsAddingRemote(true);
      setGitMessage(null);
      await git.refreshRemotes();

      const existingOrigin = git.remotes.find(r => r.name === 'origin');
      if (existingOrigin) {
        setGitMessage({
          text: 'Remote "origin" already exists. Updating URL...',
          type: 'info',
        });
        await git.setRemoteURL('origin', remoteUrl);
        setGitMessage({ text: 'Remote URL updated successfully!', type: 'success' });
        return;
      }

      await git.addRemote('origin', remoteUrl);
      setGitMessage({ text: 'Remote added successfully!', type: 'success' });
    } catch (error) {
      setGitMessage({
        text: error instanceof Error ? error.message : 'Failed to add remote',
        type: 'error',
      });
    } finally {
      setIsAddingRemote(false);
    }
  };

  const handleRemoveRemote = async (name: string) => {
    try {
      setIsRemovingRemote(true);
      setGitMessage(null);
      await git.removeRemote(name);
      setGitMessage({ text: `Remote "${name}" removed successfully!`, type: 'success' });
    } catch (error) {
      setGitMessage({
        text: error instanceof Error ? error.message : 'Failed to remove remote',
        type: 'error',
      });
    } finally {
      setIsRemovingRemote(false);
    }
  };

  const handleStartEditRemote = (name: string, url: string) => {
    setEditingRemote(name);
    setEditUrl(url);
    setGitMessage(null);
  };

  const handleCancelEditRemote = () => {
    setEditingRemote(null);
    setEditUrl('');
    setGitMessage(null);
  };

  const handleUpdateRemote = async (name: string) => {
    if (!editUrl.trim()) {
      setGitMessage({ text: 'Please enter a remote URL', type: 'error' });
      return;
    }

    try {
      setIsUpdatingRemote(true);
      setGitMessage(null);
      await git.setRemoteURL(name, editUrl);
      setGitMessage({ text: `Remote "${name}" updated successfully!`, type: 'success' });
      setEditingRemote(null);
      setEditUrl('');
    } catch (error) {
      setGitMessage({
        text: error instanceof Error ? error.message : 'Failed to update remote',
        type: 'error',
      });
    } finally {
      setIsUpdatingRemote(false);
    }
  };

  const handleTestConnection = async () => {
    if (!window.electronAPI?.git) return;

    try {
      setIsTesting(true);
      setTestResult(null);
      const result = await window.electronAPI.git.testConnection('origin');
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test connection'
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  // Check if we're in a standalone window (no overlay needed)
  const isStandaloneWindow = window.location.hash === '#settings';

  // In standalone window, don't use overlay
  if (isStandaloneWindow) {
    return (
      <div className="settings-standalone">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'filesystem' ? 'active' : ''}`}
            onClick={() => setActiveTab('filesystem')}
          >
            Filesystem
          </button>
          <button
            className={`settings-tab ${activeTab === 'git' ? 'active' : ''}`}
            onClick={() => setActiveTab('git')}
          >
            Git Sync
          </button>
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'filesystem' && (
            <div className="settings-section">
              <h3>Filesystem Sync</h3>
              <div className="settings-group">
                <label className="settings-label">Sync Directory</label>
                <div className="settings-sync-controls">
                  {syncStatus.directory ? (
                    <div className="sync-directory-info">
                      <div className="sync-path">{syncStatus.directory}</div>
                      <div className="sync-status">
                        <span className={`status-indicator ${syncStatus.status}`}>
                          {syncStatus.status === 'synced' && '✓ Synced'}
                          {syncStatus.status === 'syncing' && '⟳ Syncing...'}
                          {syncStatus.status === 'error' && '⚠ Error'}
                          {syncStatus.status === 'disabled' && '○ Disabled'}
                        </span>
                        {syncStatus.lastSync && (
                          <span className="last-sync">
                            Last synced: {new Date(syncStatus.lastSync).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      <div className="sync-actions">
                        <button
                          className="settings-button secondary"
                          onClick={handleOpenFolder}
                        >
                          Open Folder
                        </button>
                        <button
                          className="settings-button secondary"
                          onClick={handleSelectDirectory}
                          disabled={isLoading}
                        >
                          Change Directory
                        </button>
                        {syncStatus.enabled && (
                          <button
                            className="settings-button danger"
                            onClick={handleDisableSync}
                          >
                            Disable Sync
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="sync-setup">
                      <div className="sync-placeholder">
                        <div className="placeholder-icon">📁</div>
                        <p className="placeholder-title">No Sync Directory Selected</p>
                        <p className="sync-description">
                          Choose a folder to sync your notes. Your notes will be saved as markdown files
                          and can be accessed from any Git client or text editor.
                        </p>
                      </div>
                      <button
                        className="settings-button primary"
                        onClick={handleSelectDirectory}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Selecting Folder...' : 'Choose Sync Folder'}
                      </button>
                    </div>
                  )}
                </div>
                {syncStatus.message && syncStatus.status === 'error' && (
                  <div className="settings-error">{syncStatus.message}</div>
                )}
              </div>

              <div className="settings-group">
                <h4>About Filesystem Sync</h4>
                <p className="settings-info">
                  When enabled, your notes are automatically saved to your computer as markdown files.
                  This allows you to:
                </p>
                <ul className="settings-features">
                  <li>Access notes from other applications</li>
                  <li>Use version control (Git) for history and backup</li>
                  <li>Sync across devices using GitHub, Dropbox, or iCloud</li>
                  <li>Edit notes with your favorite text editor</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'git' && (
            <div className="settings-section">
              {!syncStatus.enabled || !syncStatus.directory ? (
                <div className="settings-info-box">
                  <p><strong>⚠️ Choose Directory First</strong></p>
                  <p>Please select a sync directory from the Filesystem tab before configuring Git sync.</p>
                </div>
              ) : (
                <>
                  <div className="settings-group">
                    <h3>Git Auto-Sync</h3>
                    <p className="settings-info">
                      Automatically commit and push your changes to a remote Git repository at regular intervals.
                    </p>

                    <div className="auto-sync-controls">
                      <label className="auto-sync-toggle">
                        <input
                          type="checkbox"
                          checked={autoSyncEnabled}
                          onChange={(e) => handleToggleAutoSync(e.target.checked)}
                        />
                        <span className="toggle-label">Enable Auto-Sync</span>
                      </label>

                      {autoSyncEnabled && (
                        <>
                          <div className="auto-sync-interval">
                            <label htmlFor="sync-interval">Sync Interval:</label>
                            <select
                              id="sync-interval"
                              className="settings-select"
                              value={autoSyncInterval}
                              onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                            >
                              <option value={30}>30 seconds</option>
                              <option value={60}>1 minute</option>
                              <option value={120}>2 minutes</option>
                              <option value={300}>5 minutes</option>
                              <option value={600}>10 minutes</option>
                            </select>
                          </div>

                          <div className="auto-sync-interval">
                            <label className="auto-sync-toggle">
                              <input
                                type="checkbox"
                                checked={hideAutoSyncFiles}
                                onChange={(e) => handleToggleHideAutoSyncFiles(e.target.checked)}
                              />
                              <span className="toggle-label">Hide auto-sync files from status</span>
                            </label>
                            <p className="settings-hint">
                              When enabled, automatically generated note files won't appear in the Git status view.
                            </p>
                          </div>

                          <div className="settings-info-box">
                            <p>
                              <strong>ℹ️ Auto-Sync is active</strong>
                            </p>
                            <p>
                              Changes will be automatically committed and synced every {autoSyncInterval < 60 ? `${autoSyncInterval} seconds` : `${Math.floor(autoSyncInterval / 60)} minute${autoSyncInterval >= 120 ? 's' : ''}`}.
                              Manual git buttons will be replaced with a "Sync Now" button in the Git menu.
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="settings-note">
                      <strong>Note:</strong> Configure Git remote below before enabling auto-sync.
                    </div>
                  </div>

                  <div className="settings-divider" />

                  {/* Git Configuration Section */}
                  <div className="settings-group">
                    <h3>Git Configuration</h3>

                    {/* Step 1: Check if Git is installed */}
                    {!git.isGitInstalled && (
                      <div className="settings-error">
                        <p><strong>Git is not installed</strong></p>
                        <p>Please install Git from <a href="https://git-scm.com/" target="_blank" rel="noopener noreferrer">git-scm.com</a> to enable version control.</p>
                      </div>
                    )}

                    {/* Step 2: Initialize Git Repository */}
                    {git.isGitInstalled && !git.isRepository && (
                      <div className="git-init-section">
                        <p className="settings-info">
                          Initialize Git to enable version control and sync your notes with remote repositories.
                        </p>
                        <button
                          className="settings-button primary"
                          onClick={handleInitGit}
                          disabled={isInitializing}
                        >
                          {isInitializing ? 'Initializing...' : '📦 Initialize Git Repository'}
                        </button>
                      </div>
                    )}

                    {/* Step 3: Show Repository Status & Remote Configuration */}
                    {git.isGitInstalled && git.isRepository && (
                      <>
                        {/* Repository Status */}
                        <div className="git-status-grid">
                          <div className="git-status-item">
                            <span className="label">Branch:</span>
                            <span className="value">{git.currentBranch}</span>
                          </div>
                          <div className="git-status-item">
                            <span className="label">Changes:</span>
                            <span className="value">{git.status?.files.length || 0}</span>
                          </div>
                          <div className="git-status-item">
                            <span className="label">Ahead:</span>
                            <span className="value">{git.status?.ahead || 0}</span>
                          </div>
                          <div className="git-status-item">
                            <span className="label">Behind:</span>
                            <span className="value">{git.status?.behind || 0}</span>
                          </div>
                        </div>

                        {/* First Commit Reminder */}
                        {!hasCommits && (
                          <div className="settings-info-box" style={{ marginTop: '16px' }}>
                            <p><strong>📝 Next Step: Create Your First Commit</strong></p>
                            <p>Before adding a remote, create your first commit from the Git menu at the bottom of the app.</p>
                          </div>
                        )}

                        {/* Remote Repository Configuration */}
                        <div style={{ marginTop: '20px' }}>
                          <h4>Remote Repository</h4>

                          {git.remotes.length === 0 ? (
                            <>
                              <p className="settings-info">
                                Connect to a remote repository (GitHub, GitLab, etc.) to backup and sync your notes across devices.
                              </p>
                              <div className="git-remote-input">
                                <label htmlFor="remote-url">SSH Remote URL:</label>
                                <input
                                  id="remote-url"
                                  type="text"
                                  className="settings-input"
                                  placeholder="git@github.com:username/repo.git"
                                  value={remoteUrl}
                                  onChange={(e) => setRemoteUrl(e.target.value)}
                                />
                              </div>
                              <button
                                className="settings-button primary"
                                onClick={handleAddRemote}
                                disabled={isAddingRemote || !remoteUrl.trim()}
                                style={{ marginTop: '8px' }}
                              >
                                {isAddingRemote ? 'Adding...' : '🔗 Add Remote'}
                              </button>
                            </>
                          ) : (
                            <div className="git-remotes-list">
                              {git.remotes.map((remote) => (
                                <div key={remote.name} className="git-remote-card">
                                  {editingRemote === remote.name ? (
                                    <>
                                      <div className="remote-name">{remote.name}</div>
                                      <input
                                        type="text"
                                        className="settings-input"
                                        placeholder="https://github.com/username/repo.git"
                                        value={editUrl}
                                        onChange={(e) => setEditUrl(e.target.value)}
                                        style={{ marginBottom: '8px' }}
                                      />
                                      <div className="remote-actions">
                                        <button
                                          className="settings-button secondary"
                                          onClick={handleCancelEditRemote}
                                          disabled={isUpdatingRemote}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          className="settings-button primary"
                                          onClick={() => handleUpdateRemote(remote.name)}
                                          disabled={isUpdatingRemote || !editUrl.trim()}
                                        >
                                          {isUpdatingRemote ? 'Updating...' : 'Save'}
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="remote-info">
                                        <div className="remote-name">{remote.name}</div>
                                        <div className="remote-url">{remote.refs.fetch}</div>
                                      </div>
                                      <div className="remote-actions">
                                        <button
                                          className="settings-button secondary small"
                                          onClick={() => handleStartEditRemote(remote.name, remote.refs.fetch)}
                                          disabled={isRemovingRemote}
                                        >
                                          ✏️ Edit
                                        </button>
                                        <button
                                          className="settings-button danger small"
                                          onClick={() => handleRemoveRemote(remote.name)}
                                          disabled={isRemovingRemote}
                                        >
                                          🗑️ Remove
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}

                              <button
                                className="settings-button secondary"
                                onClick={handleTestConnection}
                                disabled={isTesting}
                                style={{ marginTop: '8px' }}
                              >
                                {isTesting ? 'Testing...' : '🔌 Test Connection'}
                              </button>

                              {testResult && (
                                <div className={`settings-${testResult.success ? 'success' : 'error'}`} style={{ marginTop: '8px' }}>
                                  {testResult.success ? '✓' : '✗'} {testResult.message}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* SSH Setup Instructions */}
                        <div style={{ marginTop: '20px' }}>
                          <div className="ssh-help-header">
                            <h4>SSH Setup</h4>
                            <button
                              className="settings-button secondary small"
                              onClick={() => setShowSSHHelp(!showSSHHelp)}
                            >
                              {showSSHHelp ? 'Hide' : 'Show'} Instructions
                            </button>
                          </div>

                          {showSSHHelp && (
                            <div className="ssh-instructions">
                              <ol>
                                <li>Create a repository on GitHub, GitLab, or another Git hosting service</li>
                                <li>
                                  <strong>Generate SSH key</strong> (if you don't have one):
                                  <div className="code-snippet">
                                    <code>ssh-keygen -t ed25519 -C "your-email@example.com"</code>
                                  </div>
                                </li>
                                <li>
                                  <strong>Copy your public key</strong>:
                                  <div className="code-snippet">
                                    <code>cat ~/.ssh/id_ed25519.pub</code>
                                  </div>
                                </li>
                                <li>
                                  <strong>Add SSH key to your Git provider</strong>:
                                  <ul>
                                    <li>GitHub: <a href="https://github.com/settings/keys" target="_blank" rel="noopener noreferrer">github.com/settings/keys</a></li>
                                    <li>GitLab: <a href="https://gitlab.com/-/profile/keys" target="_blank" rel="noopener noreferrer">gitlab.com/-/profile/keys</a></li>
                                  </ul>
                                </li>
                                <li>
                                  <strong>Use SSH remote URL format</strong>:
                                  <div className="code-snippet">
                                    <code>git@github.com:username/repo.git</code>
                                  </div>
                                </li>
                                <li>Add the SSH remote URL above and test the connection</li>
                              </ol>
                              <p className="settings-note">
                                💡 SSH keys provide secure authentication without passwords
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Git Messages */}
                    {gitMessage && (
                      <div className={`settings-${gitMessage.type}`} style={{ marginTop: '12px' }}>
                        {gitMessage.text}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'general' && (
            <div className="settings-section">
              <h3>General Settings</h3>
              <div className="settings-group">
                <h4>Category Management</h4>
                <p className="settings-info">
                  Manage your expense and income categories for ZenCash finance tracking.
                </p>
                <CategoryManager />
              </div>
              <div className="settings-divider" style={{ margin: '24px 0' }} />
              <div className="settings-group">
                <h4>Other Settings</h4>
                <p className="coming-soon">Panel position and hot bar settings coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h3>Appearance</h3>
              <div className="settings-group">
                <p className="coming-soon">Theme and font settings coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Modal version for embedding in main app (if needed in future)
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'filesystem' ? 'active' : ''}`}
            onClick={() => setActiveTab('filesystem')}
          >
            Filesystem
          </button>
          <button
            className={`settings-tab ${activeTab === 'git' ? 'active' : ''}`}
            onClick={() => setActiveTab('git')}
          >
            Git Sync
          </button>
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
        </div>

        <div className="settings-content">
          {/* Reuse same content as standalone mode */}
          {/* Content would be duplicated here if we need modal version */}
        </div>
      </div>
    </div>
  );
};