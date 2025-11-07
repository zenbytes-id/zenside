import React, { useRef, useEffect, useState } from 'react';
import { FiX, FiClock } from 'react-icons/fi';

interface SearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  searchHistory: string[];
  isSearching: boolean;
}

export const Search: React.FC<SearchProps> = ({
  query,
  onQueryChange,
  onClose,
  searchHistory,
  isSearching,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onQueryChange(e.target.value);
    setShowHistory(false);
  };

  const handleInputFocus = () => {
    if (!query && searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleHistoryClick = (historyQuery: string) => {
    onQueryChange(historyQuery);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search notes... (Cmd+F)"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          autoComplete="off"
        />

        {isSearching && (
          <div className="search-spinner">
            <div className="spinner-small"></div>
          </div>
        )}

        {!isSearching && (
          <button
            className="search-close-btn"
            onClick={onClose}
            title="Close search (Esc)"
          >
            <FiX size={18} />
          </button>
        )}
      </div>

      {/* Search History Dropdown */}
      {showHistory && searchHistory.length > 0 && !query && (
        <div className="search-history-dropdown">
          <div className="search-history-header">Recent Searches</div>
          {searchHistory.map((historyItem, index) => (
            <div
              key={index}
              className="search-history-item"
              onClick={() => handleHistoryClick(historyItem)}
            >
              <FiClock size={14} />
              <span>{historyItem}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
