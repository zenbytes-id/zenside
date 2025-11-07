import React, { useState, useEffect } from 'react';
import { useGit } from '../../hooks/useGit';
import { GitLogEntry } from '../../types/electron';
import { formatDistanceToNow } from 'date-fns';
import './git-history-dialog.css';

interface GitHistoryDialogProps {
  syncDirectory: string | null;
  onClose: () => void;
}

export const GitHistoryDialog: React.FC<GitHistoryDialogProps> = ({
  syncDirectory,
  onClose,
}) => {
  const git = useGit(syncDirectory);
  const [commits, setCommits] = useState<GitLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unpushedCount, setUnpushedCount] = useState(0);

  // Load commits only once on mount
  useEffect(() => {
    const loadCommits = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const log = await git.getLog(50);
        setCommits(log.all);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };

    loadCommits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update unpushed count when git status changes
  useEffect(() => {
    if (!git.status || commits.length === 0) {
      return;
    }

    // Determine unpushed commits count
    let unpushed = 0;

    if (!git.status.tracking) {
      // No tracking branch means nothing has been pushed yet
      // All commits are unpushed
      unpushed = commits.length;
      console.log('[GitHistory] No tracking branch - all commits are unpushed:', unpushed);
    } else {
      // Has tracking branch - use ahead count
      unpushed = git.status.ahead || 0;
      console.log('[GitHistory] Has tracking branch - ahead commits:', unpushed);
    }

    console.log('[GitHistory] Status:', git.status);
    setUnpushedCount(unpushed);
  }, [git.status, commits.length]);

  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content git-history-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Commit History</h3>
            {unpushedCount > 0 && (
              <div className="history-summary">
                {unpushedCount} unpushed commit{unpushedCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {isLoading && (
            <div className="history-loading">Loading commits...</div>
          )}

          {error && (
            <div className="git-message error">
              {error}
            </div>
          )}

          {!isLoading && !error && commits.length === 0 && (
            <div className="no-commits">No commits yet</div>
          )}

          {!isLoading && !error && commits.length > 0 && (
            <div className="commits-list">
              {commits.map((commit, index) => {
                // First N commits (where N = unpushedCount) are unpushed
                const isUnpushed = index < unpushedCount;

                return (
                  <div key={commit.hash} className={`commit-item ${isUnpushed ? 'unpushed' : 'pushed'}`}>
                    <div className="commit-header">
                      <div className="commit-header-left">
                        <span className="commit-hash" title={commit.hash}>
                          {commit.hash.substring(0, 7)}
                        </span>
                        {isUnpushed && (
                          <span className="commit-badge unpushed-badge" title="Not pushed to remote">
                            ⬆ Unpushed
                          </span>
                        )}
                      </div>
                      <span className="commit-time">
                        {formatRelativeTime(commit.date)}
                      </span>
                    </div>
                    <div className="commit-message">{commit.message}</div>
                    <div className="commit-author">
                      {commit.author_name}
                    </div>
                  </div>
                );
              })}
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
