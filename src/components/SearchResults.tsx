import React from 'react';
import { Note, Folder } from '../types/note';
import { SearchResult } from '../utils/search';
import { highlightText, getFolderPath } from '../utils/search';
import { extractTitle } from '../utils/noteUtils';
import { formatDistanceToNow } from 'date-fns';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  folders: Folder[];
  onSelectNote: (note: Note) => void;
  isSearching: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  folders,
  onSelectNote,
  isSearching,
}) => {
  const handleResultClick = (note: Note) => {
    onSelectNote(note);
  };

  // Loading state
  if (isSearching) {
    return (
      <div className="search-results-container">
        <div className="search-results-loading">
          <div className="spinner"></div>
          <p>Searching...</p>
        </div>
      </div>
    );
  }

  // Empty state - no query
  if (!query.trim()) {
    return (
      <div className="search-results-container">
        <div className="search-results-empty">
          <div className="search-empty-icon">🔍</div>
          <p className="search-empty-title">Search Your Notes</p>
          <p className="search-empty-description">
            Type to search through titles and content
          </p>
        </div>
      </div>
    );
  }

  // Empty state - no results
  if (results.length === 0) {
    return (
      <div className="search-results-container">
        <div className="search-results-empty">
          <div className="search-empty-icon">🔍</div>
          <p className="search-empty-title">No results found</p>
          <p className="search-empty-description">
            No notes match "{query}"
          </p>
        </div>
      </div>
    );
  }

  // Results list
  return (
    <div className="search-results-container">
      <div className="search-results-list">
        {results.map((result) => {
          const folderPathStr = getFolderPath(result.note.folderId, folders);
          const timeAgo = formatDistanceToNow(result.note.updatedAt, { addSuffix: true });
          const title = extractTitle(result.note.content);

          return (
            <div
              key={result.note.id}
              className="search-result-item"
              onClick={() => handleResultClick(result.note)}
            >
              <h3
                className="search-result-title"
                dangerouslySetInnerHTML={{
                  __html: highlightText(title, query)
                }}
              />

              {result.preview && (
                <p
                  className="search-result-preview"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(result.preview, query)
                  }}
                />
              )}

              <div className="search-result-meta">
                <span className="search-result-folder">{folderPathStr}</span>
                <span className="search-result-divider">•</span>
                <span className="search-result-time">{timeAgo}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
