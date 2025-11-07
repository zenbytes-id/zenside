/**
 * Extract title from note content (first line)
 * @param content - Note content
 * @returns Title string (first line, max 100 chars)
 */
export function extractTitle(content: string): string {
  if (!content || content.trim() === '') {
    return 'Untitled';
  }

  // Get first line
  const firstLine = content.split('\n')[0].trim();

  if (firstLine === '') {
    // If first line is empty, try to find first non-empty line
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed !== '') {
        return trimmed.substring(0, 100);
      }
    }
    return 'Untitled';
  }

  // Remove markdown heading markers if present
  const withoutHash = firstLine.replace(/^#+\s*/, '');

  // Limit to 100 characters
  return withoutHash.substring(0, 100);
}

/**
 * Generate a filename from note content
 * @param content - Note content
 * @returns Safe filename string
 */
export function generateFilename(content: string): string {
  const title = extractTitle(content);

  // Convert to safe filename
  const safe = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Remove consecutive dashes
    .substring(0, 50); // Limit length

  return safe || 'untitled';
}
