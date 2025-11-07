import { useState, useEffect, useCallback } from 'react';
import { Note, Folder } from '../types/note';
import {
  SearchResult,
  searchNotes,
  addToSearchHistory,
  getSearchHistory,
} from '../utils/search';

export interface UseSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  searchHistory: string[];
  performSearch: (searchQuery: string) => void;
  clearSearch: () => void;
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

/**
 * Custom hook for search functionality
 * @param notes - Array of notes to search
 * @param folders - Array of folders (for folder paths)
 * @returns Search state and functions
 */
export function useSearch(notes: Note[], folders: Folder[]): UseSearchResult {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Perform search with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounce search by 300ms
    const timeoutId = setTimeout(() => {
      const searchResults = searchNotes(notes, query);
      setResults(searchResults);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, notes]);

  const performSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      addToSearchHistory(searchQuery);
      setSearchHistory(getSearchHistory());
    }
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsSearching(false);
  }, []);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    clearSearch();
  }, [clearSearch]);

  return {
    query,
    setQuery,
    results,
    isSearching,
    searchHistory,
    performSearch,
    clearSearch,
    isSearchOpen,
    openSearch,
    closeSearch,
  };
}
