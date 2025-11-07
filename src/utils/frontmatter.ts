import matter from 'gray-matter';
import { Note } from '../types/note';

export interface NoteFrontmatter {
  id?: string;
  type?: 'markdown' | 'plaintext' | 'code';
  folderId?: string;
  created?: string;
  updated?: string;
  tags?: string[];
  color?: string;
}

/**
 * Format a note with YAML frontmatter
 */
export function formatNoteWithFrontmatter(note: Note): string {
  const frontmatter: NoteFrontmatter = {
    id: note.id,
    type: note.type,
    folderId: note.folderId,
    created: note.createdAt.toISOString(),
    updated: note.updatedAt.toISOString(),
  };

  // Create frontmatter string
  const matterString = matter.stringify(note.content, frontmatter);

  return matterString;
}

/**
 * Parse a note from markdown content with frontmatter
 */
export function parseNoteFromMarkdown(content: string): Partial<Note> {
  const parsed = matter(content);
  const data = parsed.data as NoteFrontmatter;

  return {
    id: data.id,
    content: parsed.content.trim(),
    type: data.type || 'markdown',
    folderId: data.folderId,
    createdAt: data.created ? new Date(data.created) : new Date(),
    updatedAt: data.updated ? new Date(data.updated) : new Date(),
    isDirty: false
  };
}

/**
 * Generate a safe filename from a note title
 */
export function generateFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
    .substring(0, 100)             // Limit length
    || 'untitled';                 // Fallback
}

/**
 * Extract title from a filename
 */
export function extractTitleFromFilename(filename: string): string {
  // Remove .md extension
  const name = filename.replace(/\.md$/i, '');

  // Convert hyphens/underscores to spaces and capitalize words
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}