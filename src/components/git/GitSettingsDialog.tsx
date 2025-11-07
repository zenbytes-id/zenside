import React, { useState, useEffect } from 'react';
import { useGit } from '../../hooks/useGit';
import './git-settings-dialog.css';

interface GitSettingsDialogProps {
  syncDirectory: string | null;
  onClose: () => void;
}

export const GitSettingsDialog: React.FC<GitSettingsDialogProps> = ({
  syncDirectory,
  onClose,
}) => {
  const git = useGit(syncDirectory);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAddingRemote, setIsAddingRemote] = useState(false);
  const [isRemovingRemote, setIsRemovingRemote] = useState(false);
  const [isUpdatingRemote, setIsUpdatingRemote] = useState(false);
  const [editingRemote, setEditingRemote] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showAuthHelp, setShowAuthHelp] = useState(false);
  const [hasCommits, setHasCommits] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showSSHHelp, setShowSSHHelp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Refresh remotes and check for commits when dialog opens
  useEffect(() => {
    const loadData = async () => {
      if (git.isRepository) {
        await git.refreshRemotes();

        // Check if there are any commits
        try {
          const log = await git.getLog(1);
          setHasCommits(log.total > 0);
        } catch (error) {
          // If error getting log, assume no commits
          setHasCommits(false);
        }
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [git.isRepository]);

  useEffect(() => {
    // Load existing remotes
    if (git.remotes.length > 0) {
      const origin = git.remotes.find(r => r.name === 'origin');
      if (origin) {
        setRemoteUrl(origin.refs.fetch);
      }
    }
  }, [git.remotes]);

  const handleInit = async () => {
    try {
      setIsInitializing(true);
      setMessage(null);
      console.log('[GitSettings] Calling git.init()...');
      await git.init();
      console.log('[GitSettings] git.init() completed');

      // Force refresh status after init
      console.log('[GitSettings] Forcing status refresh...');
      await git.refreshStatus();
      console.log('[GitSettings] Status refreshed');

      setMessage({ text: 'Git repository initialized successfully!', type: 'success' });
    } catch (error) {
      console.error('[GitSettings] Init error:', error);
      setMessage({
        text: error instanceof Error ? error.message : 'Failed to initialize repository',
        type: 'error',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAddRemote = async () => {
    if (!remoteUrl.trim()) {
      setMessage({ text: 'Please enter a remote URL', type: 'error' });
      return;
    }

    try {
      setIsAddingRemote(true);
      setMessage(null);

      // Refresh remotes to get latest state
      await git.refreshRemotes();

      // Check if origin already exists
      const existingOrigin = git.remotes.find(r => r.name === 'origin');
      if (existingOrigin) {
        // If remote exists, update its URL instead of adding
        setMessage({
          text: 'Remote "origin" already exists. Updating URL...',
          type: 'info',
        });
        await git.setRemoteURL('origin', remoteUrl);

        // Enable auto-sync by default after updating remote URL
        localStorage.setItem('git-auto-sync-enabled', 'true');
        localStorage.setItem('git-auto-sync-interval', '60'); // 60 seconds default

        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('git:auto-sync-changed', {
          detail: { enabled: true, interval: 60 }
        }));

        setMessage({ text: 'Remote URL updated successfully! Auto-sync enabled.', type: 'success' });
        return;
      }

      await git.addRemote('origin', remoteUrl);

      // Enable auto-sync by default after adding remote
      localStorage.setItem('git-auto-sync-enabled', 'true');
      localStorage.setItem('git-auto-sync-interval', '60'); // 60 seconds default

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('git:auto-sync-changed', {
        detail: { enabled: true, interval: 60 }
      }));

      setMessage({ text: 'Remote added successfully! Auto-sync enabled.', type: 'success' });
    } catch (error) {
      setMessage({
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
      setMessage(null);
      await git.removeRemote(name);
      setMessage({ text: `Remote "${name}" removed successfully!`, type: 'success' });
    } catch (error) {
      setMessage({
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
    setMessage(null);
  };

  const handleCancelEditRemote = () => {
    setEditingRemote(null);
    setEditUrl('');
    setMessage(null);
  };

  const handleUpdateRemote = async (name: string) => {
    if (!editUrl.trim()) {
      setMessage({ text: 'Please enter a remote URL', type: 'error' });
      return;
    }

    try {
      setIsUpdatingRemote(true);
      setMessage(null);
      await git.setRemoteURL(name, editUrl);
      setMessage({ text: `Remote "${name}" updated successfully!`, type: 'success' });
      setEditingRemote(null);
      setEditUrl('');
    } catch (error) {
      setMessage({
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content git-settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Git Settings</h3>
          <button className="btn-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {!git.isGitInstalled && (
            <div className="git-message error">
              <p><strong>Git is not installed</strong></p>
              <p>Please install Git from <a href="https://git-scm.com/" target="_blank" rel="noopener noreferrer">git-scm.com</a></p>
            </div>
          )}

          {git.isGitInstalled && !git.isRepository && (
            <div className="git-section">
              <h4>Initialize Repository</h4>
              <p className="git-section-description">
                This directory is not a Git repository. Initialize it to start version control.
              </p>
              <button
                className="btn-create"
                onClick={handleInit}
                disabled={isInitializing}
              >
                {isInitializing ? 'Initializing...' : 'Initialize Git Repository'}
              </button>
            </div>
          )}

          {git.isGitInstalled && git.isRepository && (
            <>
              <div className="git-section">
                <h4>Repository Status</h4>
                <div className="git-info-grid">
                  <div className="git-info-item">
                    <span className="label">Current Branch:</span>
                    <span className="value">{git.currentBranch}</span>
                  </div>
                  <div className="git-info-item">
                    <span className="label">Uncommitted Changes:</span>
                    <span className="value">{git.status?.files.length || 0}</span>
                  </div>
                  <div className="git-info-item">
                    <span className="label">Ahead:</span>
                    <span className="value">{git.status?.ahead || 0}</span>
                  </div>
                  <div className="git-info-item">
                    <span className="label">Behind:</span>
                    <span className="value">{git.status?.behind || 0}</span>
                  </div>
                </div>
              </div>

              {/* Show first commit prompt if no commits exist yet */}
              {!hasCommits && (
                <div className="git-section">
                  <div className="git-message info">
                    <p><strong>📝 Next Step: Create Your First Commit</strong></p>
                    <p>Before adding a remote, you need to commit your existing notes:</p>
                    <ol style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '8px' }}>
                      <li>Close this dialog</li>
                      <li>Click the Git menu at the bottom</li>
                      <li>Click "Commit" to commit your notes</li>
                      <li>Then return here to add a remote repository</li>
                    </ol>
                  </div>
                </div>
              )}

              <div className="git-section">
                <h4>Remote Repository</h4>
                {git.remotes.length === 0 ? (
                  <>
                    <p className="git-section-description">
                      Add a remote repository to sync your notes with a Git hosting service (GitHub, GitLab, etc.).
                    </p>
                    <div className="git-form-group">
                      <label htmlFor="remote-url">SSH Remote URL:</label>
                      <input
                        id="remote-url"
                        type="text"
                        className="git-input"
                        placeholder="git@github.com:username/repo.git"
                        value={remoteUrl}
                        onChange={(e) => setRemoteUrl(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn-create"
                      onClick={handleAddRemote}
                      disabled={isAddingRemote || !remoteUrl.trim()}
                    >
                      {isAddingRemote ? 'Processing...' : 'Add Remote'}
                    </button>
                  </>
                ) : (
                  <div className="git-remotes-list">
                    {git.remotes.map((remote) => (
                      <div key={remote.name} className="git-remote-item">
                        {editingRemote === remote.name ? (
                          <>
                            <div className="remote-name">{remote.name}</div>
                            <div className="git-form-group" style={{ marginBottom: '8px' }}>
                              <input
                                type="text"
                                className="git-input"
                                placeholder="https://github.com/username/repo.git"
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                              />
                            </div>
                            <div className="remote-actions">
                              <button
                                className="btn-cancel"
                                onClick={handleCancelEditRemote}
                                disabled={isUpdatingRemote}
                              >
                                Cancel
                              </button>
                              <button
                                className="btn-create"
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
                                className="btn-icon-remote"
                                onClick={() => handleStartEditRemote(remote.name, remote.refs.fetch)}
                                disabled={isRemovingRemote}
                                title="Edit remote URL"
                              >
                                ✏️
                              </button>
                              <button
                                className="btn-icon-remote btn-remove"
                                onClick={() => handleRemoveRemote(remote.name)}
                                disabled={isRemovingRemote}
                                title="Remove remote"
                              >
                                🗑️
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {git.remotes.length > 0 && (
                  <>
                    <button
                      className="btn-test-connection"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                    >
                      {isTesting ? 'Testing...' : '🔌 Test Connection'}
                    </button>

                    {testResult && (
                      <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                        {testResult.success ? '✓' : '✗'} {testResult.message}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="git-section">
                <div className="ssh-help-header">
                  <h4>SSH Setup Instructions</h4>
                  <button
                    className="git-help-link"
                    onClick={() => setShowSSHHelp(!showSSHHelp)}
                  >
                    {showSSHHelp ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showSSHHelp && (
                  <>
                <ol className="git-instructions">
                  <li>Create a repository on GitHub, GitLab, or another Git hosting service</li>
                  <li>
                    <strong>Generate SSH key</strong> (if you don't have one):
                    <div className="code-block-inline">
                      <code>ssh-keygen -t ed25519 -C "your-email@example.com"</code>
                    </div>
                  </li>
                  <li>
                    <strong>Copy your public key</strong>:
                    <div className="code-block-inline">
                      <code>cat ~/.ssh/id_ed25519.pub</code>
                    </div>
                  </li>
                  <li>
                    <strong>Add SSH key to your Git provider</strong>:
                    <ul className="git-sub-instructions">
                      <li>GitHub: <a href="https://github.com/settings/keys" target="_blank" rel="noopener noreferrer">github.com/settings/keys</a></li>
                      <li>GitLab: <a href="https://gitlab.com/-/profile/keys" target="_blank" rel="noopener noreferrer">gitlab.com/-/profile/keys</a></li>
                    </ul>
                  </li>
                  <li>
                    <strong>Use SSH remote URL format</strong>:
                    <div className="code-block-inline">
                      <code>git@github.com:username/repo.git</code>
                    </div>
                  </li>
                  <li>Add the SSH remote URL above and test the connection</li>
                </ol>
                <div className="git-help-text">
                  💡 SSH keys provide secure authentication without passwords
                </div>
                  </>
                )}
              </div>
            </>
          )}

          {message && (
            <div className={`git-message ${message.type}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
