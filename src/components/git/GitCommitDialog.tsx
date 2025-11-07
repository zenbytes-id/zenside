import React, { useState } from 'react';
import { useGit } from '../../hooks/useGit';
import './git-commit-dialog.css';

interface GitCommitDialogProps {
  syncDirectory: string | null;
  onClose: () => void;
  onCommitSuccess?: () => void;
}

export const GitCommitDialog: React.FC<GitCommitDialogProps> = ({
  syncDirectory,
  onClose,
  onCommitSuccess,
}) => {
  const git = useGit(syncDirectory);
  const [message, setMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh status when dialog opens
  React.useEffect(() => {
    const refreshStatus = async () => {
      if (git.isRepository) {
        setIsRefreshing(true);
        try {
          await git.refreshStatus();
        } catch (err) {
          console.error('[GitCommitDialog] Error refreshing status:', err);
        } finally {
          setIsRefreshing(false);
        }
      }
    };
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [git.isRepository]);

  const handleCommit = async () => {
    if (!message.trim()) {
      setError('Please enter a commit message');
      return;
    }

    try {
      setIsCommitting(true);
      setError(null);

      // Add all changed files
      await git.add('.');

      // Commit
      await git.commit(message);

      // Notify parent of successful commit
      if (onCommitSuccess) {
        onCommitSuccess();
      }

      // Close dialog
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit');
    } finally {
      setIsCommitting(false);
    }
  };

  const changedFiles = git.status?.files || [];
  const hasChanges = changedFiles.length > 0;

  // Log for debugging
  console.log('[GitCommitDialog] Status:', {
    hasStatus: !!git.status,
    changedFiles: changedFiles.length,
    isRefreshing
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content git-commit-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Commit Changes</h3>
          <button className="btn-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="commit-section">
            <h4>Changed Files ({changedFiles.length})</h4>
            <div className="changed-files-list">
              {isRefreshing ? (
                <div className="no-changes">Loading files...</div>
              ) : changedFiles.length === 0 ? (
                <div className="no-changes">
                  No changes detected. If you have changes, click Commit anyway - Git will stage all files.
                </div>
              ) : (
                changedFiles.map((file, index) => (
                  <div key={index} className="changed-file-item">
                    <span className="file-status">{file.working_dir || file.index}</span>
                    <span className="file-path">{file.path}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="commit-section">
            <h4>Commit Message</h4>
            <textarea
              className="commit-message-input"
              placeholder="Enter commit message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          {error && (
            <div className="git-message error">
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-create"
            onClick={handleCommit}
            disabled={isCommitting || !message.trim()}
            title={!hasChanges ? 'Will stage and commit all files' : `Commit ${changedFiles.length} file(s)`}
          >
            {isCommitting ? 'Committing...' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  );
};
