import React from 'react';
import { GitStatusResult } from '../../types/electron';
import './git-status-dialog.css';

interface GitStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  status: GitStatusResult | null;
  onCommit: () => void;
}

export const GitStatusDialog: React.FC<GitStatusDialogProps> = ({
  isOpen,
  onClose,
  status,
  onCommit,
}) => {
  if (!isOpen || !status) return null;

  // Check if auto-sync is enabled and if we should hide auto-sync files
  const isAutoSyncEnabled = localStorage.getItem('git-auto-sync-enabled') === 'true';
  const shouldHideAutoSyncFiles = localStorage.getItem('git-auto-sync-hide-files') !== 'false'; // Default to true

  // Filter function to exclude auto-sync generated files
  const isAutoSyncFile = (path: string) => {
    // Auto-sync files are timestamp-based like: 1762323118666-new-note.md
    // They can also be in folders like: folder-1762232030505/1762319704626-new-note.md
    const fileName = path.split('/').pop() || '';
    const folderPath = path.split('/').slice(0, -1).join('/');

    // Check if filename starts with timestamp pattern (13 digits)
    const isTimestampFile = /^\d{13}-/.test(fileName);

    // Check if folder name starts with "folder-" followed by timestamp
    const isInTimestampFolder = /folder-\d{13}/.test(folderPath);

    return isTimestampFile || isInTimestampFolder;
  };

  const getStatusIcon = (file: { index: string; working_dir: string }) => {
    // Working directory status
    if (file.working_dir === 'M') return { icon: '●', label: 'Modified', color: '#ffa500' };
    if (file.working_dir === 'D') return { icon: '−', label: 'Deleted', color: '#ff4444' };
    if (file.working_dir === '?') return { icon: '+', label: 'Untracked', color: '#00d4ff' };

    // Index (staged) status
    if (file.index === 'M') return { icon: '✓', label: 'Modified (staged)', color: '#4ade80' };
    if (file.index === 'A') return { icon: '✓', label: 'Added (staged)', color: '#4ade80' };
    if (file.index === 'D') return { icon: '✓', label: 'Deleted (staged)', color: '#4ade80' };

    return { icon: '?', label: 'Unknown', color: '#888' };
  };

  const getFileName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  const getFilePath = (path: string) => {
    const parts = path.split('/');
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('/');
  };

  // Filter files based on auto-sync setting
  const filterFiles = (files: typeof status.files) => {
    if (!isAutoSyncEnabled || !shouldHideAutoSyncFiles) return files;
    // When auto-sync is enabled AND user wants to hide auto-sync files, filter them out
    return files.filter(f => !isAutoSyncFile(f.path));
  };

  const stagedFiles = filterFiles(status.files.filter(f => f.index !== ' ' && f.index !== '?'));
  const unstagedFiles = filterFiles(status.files.filter(f => f.working_dir !== ' ' && f.working_dir !== ''));

  const totalFilteredFiles = stagedFiles.length + unstagedFiles.length;
  const totalFiles = status.files.length;

  return (
    <div className="git-status-overlay" onClick={onClose}>
      <div className="git-status-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="git-status-header">
          <h2>Git Status</h2>
          <button className="git-status-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="git-status-content">
          {totalFilteredFiles === 0 ? (
            <div className="git-status-empty">
              <div className="empty-icon">✓</div>
              <p>No changes</p>
              <span className="empty-subtitle">
                {isAutoSyncEnabled && shouldHideAutoSyncFiles && totalFiles > 0
                  ? 'Auto-sync is managing your changes'
                  : 'Working directory is clean'}
              </span>
            </div>
          ) : (
            <>
              {/* Branch info */}
              <div className="git-status-info">
                <div className="status-info-item">
                  <span className="info-label">Branch:</span>
                  <span className="info-value">{status.current || 'Unknown'}</span>
                </div>
                {status.tracking && (
                  <div className="status-info-item">
                    <span className="info-label">Tracking:</span>
                    <span className="info-value">{status.tracking}</span>
                  </div>
                )}
                {(status.ahead > 0 || status.behind > 0) && (
                  <div className="status-info-item">
                    <span className="info-label">Sync:</span>
                    <span className="info-value">
                      {status.ahead > 0 && <span className="ahead">↑ {status.ahead}</span>}
                      {status.behind > 0 && <span className="behind">↓ {status.behind}</span>}
                    </span>
                  </div>
                )}
              </div>

              {/* Staged changes */}
              {stagedFiles.length > 0 && (
                <div className="git-status-section">
                  <h3 className="section-title">
                    Staged Changes ({stagedFiles.length})
                  </h3>
                  <div className="file-list">
                    {stagedFiles.map((file, index) => {
                      const statusInfo = getStatusIcon(file);
                      return (
                        <div key={index} className="file-item">
                          <span
                            className="file-status"
                            style={{ color: statusInfo.color }}
                            title={statusInfo.label}
                          >
                            {statusInfo.icon}
                          </span>
                          <div className="file-info">
                            <span className="file-name">{getFileName(file.path)}</span>
                            {getFilePath(file.path) && (
                              <span className="file-path">{getFilePath(file.path)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unstaged changes */}
              {unstagedFiles.length > 0 && (
                <div className="git-status-section">
                  <h3 className="section-title">
                    Changes ({unstagedFiles.length})
                  </h3>
                  <div className="file-list">
                    {unstagedFiles.map((file, index) => {
                      const statusInfo = getStatusIcon(file);
                      return (
                        <div key={index} className="file-item">
                          <span
                            className="file-status"
                            style={{ color: statusInfo.color }}
                            title={statusInfo.label}
                          >
                            {statusInfo.icon}
                          </span>
                          <div className="file-info">
                            <span className="file-name">{getFileName(file.path)}</span>
                            {getFilePath(file.path) && (
                              <span className="file-path">{getFilePath(file.path)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="git-status-footer">
          <button className="git-status-btn secondary" onClick={onClose}>
            Close
          </button>
          {totalFilteredFiles > 0 && (
            <button
              className="git-status-btn primary"
              onClick={() => {
                onClose();
                onCommit();
              }}
            >
              Commit Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
