import { Note, Folder } from '../types/note';
import { extractTitle } from './noteUtils';

export interface SearchResult {
  note: Note;
  titleMatches: number;
  contentMatches: number;
  relevanceScore: number;
  preview: string;
  highlightedPreview?: string;
}

/**
 * Highlight search terms in text
 * @param text - Text to highlight
 * @param query - Search query
 * @returns HTML string with highlighted terms
 */
export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;

  const terms = query.toLowerCase().trim().split(/\s+/);
  let result = text;

  terms.forEach((term) => {
    if (term.length === 0) return;

    // Escape special regex characters
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  });

  return result;
}

/**
 * Extract a preview of content around the first match
 * @param content - Full content
 * @param query - Search query
 * @param maxLength - Maximum preview length
 * @returns Preview string
 */
export function extractPreview(content: string, query: string, maxLength: number = 150): string {
  if (!content) return '';

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    // No search query, return first N chars
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  // Find first match position
  const matchIndex = lowerContent.indexOf(lowerQuery);

  if (matchIndex === -1) {
    // No match, return first N chars
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  // Calculate preview window
  const start = Math.max(0, matchIndex - Math.floor(maxLength / 3));
  const end = Math.min(content.length, start + maxLength);

  let preview = content.substring(start, end);

  // Add ellipsis if needed
  if (start > 0) preview = '...' + preview;
  if (end < content.length) preview = preview + '...';

  return preview;
}

/**
 * Count matches in text
 * @param text - Text to search
 * @param query - Search query
 * @returns Number of matches
 */
export function countMatches(text: string, query: string): number {
  if (!text || !query.trim()) return 0;

  const lowerText = text.toLowerCase();
  const terms = query.toLowerCase().trim().split(/\s+/);

  let count = 0;
  terms.forEach((term) => {
    if (term.length === 0) return;
    const matches = lowerText.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
    count += matches ? matches.length : 0;
  });

  return count;
}

/**
 * Calculate relevance score for search result
 * @param note - Note to score
 * @param query - Search query
 * @returns Relevance score (higher is better)
 */
export function calculateRelevance(note: Note, query: string): number {
  const title = extractTitle(note.content);
  const titleMatches = countMatches(title, query);
  const contentMatches = countMatches(note.content, query);

  // Title matches are worth more (5x)
  const titleScore = titleMatches * 5;
  const contentScore = contentMatches;

  // Recency bonus (up to 1 point for notes from last 7 days)
  const daysSinceUpdate = (Date.now() - note.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - (daysSinceUpdate / 7));

  return titleScore + contentScore + recencyScore;
}

/**
 * Search notes by query
 * @param notes - Array of notes to search
 * @param query - Search query string
 * @returns Array of search results sorted by relevance
 */
export function searchNotes(notes: Note[], query: string): SearchResult[] {
  if (!query.trim()) return [];

  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  notes.forEach((note) => {
    const title = extractTitle(note.content);
    const titleMatches = countMatches(title, query);
    const contentMatches = countMatches(note.content, query);

    // Only include notes with at least one match
    if (titleMatches > 0 || contentMatches > 0) {
      const relevanceScore = calculateRelevance(note, query);
      const preview = extractPreview(note.content, query);

      results.push({
        note,
        titleMatches,
        contentMatches,
        relevanceScore,
        preview,
      });
    }
  });

  // Sort by relevance (highest first)
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return results;
}

/**
 * Get folder path string
 * @param folderId - Folder ID
 * @param folders - All folders
 * @returns Folder path like "Folder > Subfolder"
 */
export function getFolderPath(folderId: string | undefined, folders: Folder[]): string {
  if (!folderId) return 'Root';

  const path: string[] = [];
  let currentFolderId: string | undefined = folderId;

  // Build path from current folder to root
  while (currentFolderId) {
    const folder = folders.find(f => f.id === currentFolderId);
    if (!folder) break;

    path.unshift(folder.name);
    currentFolderId = folder.parentId;
  }

  return path.length > 0 ? path.join(' > ') : 'Root';
}

/**
 * Search history management
 */
const SEARCH_HISTORY_KEY = 'search-history';
const MAX_HISTORY_ITEMS = 10;

export function getSearchHistory(): string[] {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

export function addToSearchHistory(query: string): void {
  if (!query.trim()) return;

  try {
    let history = getSearchHistory();

    // Remove if already exists (will re-add at front)
    history = history.filter(item => item !== query);

    // Add to front
    history.unshift(query);

    // Keep only MAX_HISTORY_ITEMS
    history = history.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear search history:', error);
  }
}
