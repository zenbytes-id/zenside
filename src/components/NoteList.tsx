import React, { useRef, useEffect } from 'react';
import { Note, Folder } from '../types/note';
import { MarkdownWYSIWYG } from './MarkdownWYSIWYG';

interface NoteListProps {
  notes: Note[];
  folders: Folder[];
  selectedNote: Note | null;
  highlightedNoteId?: string | null;
  onSelectNote: (note: Note) => void;
  onHighlightNote?: (noteId: string | null) => void;
  onDeleteNote: (noteId: string) => void;
  onUpdateNote: (note: Note) => void;
}

const NoteList: React.FC<NoteListProps> = ({
  notes,
  folders,
  selectedNote,
  highlightedNoteId,
  onSelectNote,
  onHighlightNote,
  onDeleteNote,
  onUpdateNote,
}) => {
  const noteListRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle scrollbar auto-hide
  useEffect(() => {
    const noteList = noteListRef.current;
    if (!noteList) return;

    // DEBUG: Log computed styles
    const computedStyle = window.getComputedStyle(noteList);
    console.log('Note List Direction:', computedStyle.direction);
    console.log('Note List Classes:', noteList.className);

    // Remove any existing scrolling class on mount
    noteList.classList.remove('scrolling');

    const handleScroll = () => {
      noteList.classList.add('scrolling');

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        noteList.classList.remove('scrolling');
      }, 3000);
    };

    noteList.addEventListener('scroll', handleScroll);

    return () => {
      noteList.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Clean up scrolling class on unmount
      noteList.classList.remove('scrolling');
    };
  }, [notes]); // Re-run when notes change
  const formatDate = (date: Date) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Check if date is today
    if (date >= startOfToday) {
      return `Today ${time}`;
    }

    // Check if date is yesterday
    if (date >= startOfYesterday && date < startOfToday) {
      return `Yesterday ${time}`;
    }

    // For dates within the last 7 days, show day name
    const daysDiff = Math.floor((startOfToday.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      return `${dayName} ${time}`;
    }

    // For dates within current year, show day name and date without year
    if (date.getFullYear() === now.getFullYear()) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dayMonth = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      return `${dayName} ${dayMonth} ${time}`;
    }

    // For older dates, show full date with time
    const fullDate = date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    return `${fullDate} ${time}`;
  };

  const handleContentChange = (note: Note, newContent: string) => {
    const updatedNote = {
      ...note,
      content: newContent,
      updatedAt: new Date(),
    };
    onUpdateNote(updatedNote);
  };

  const handleEditorFocus = (noteId: string) => {
    // Highlight note when editor gets focus (user starts typing)
    if (onHighlightNote) {
      onHighlightNote(noteId);
    }
  };

  const handleEditorBlur = () => {
    // Clear highlight when editor loses focus
    if (onHighlightNote) {
      onHighlightNote(null);
    }
  };

  const handleNoteClick = (note: Note, e: React.MouseEvent) => {
    // Only highlight note if clicking on the card (header or border), not in editor
    const target = e.target as HTMLElement;

    // Check if clicking on note-item-header or the card border
    if (target.closest('.note-item-header') || target.classList.contains('note-item-full')) {
      if (onHighlightNote) {
        onHighlightNote(note.id);
      }
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Clear highlight if clicking on the list background
    if (e.target === e.currentTarget) {
      if (onHighlightNote) {
        onHighlightNote(null);
      }
    }
  };

  return (
    <div
      ref={noteListRef}
      className="note-list"
      onClick={handleBackgroundClick}
      style={{
        transform: 'scaleX(-1)',
        WebkitTransform: 'scaleX(-1)'
      }}
    >
      <div style={{ transform: 'scaleX(-1)', WebkitTransform: 'scaleX(-1)' }}>
        {notes.length === 0 ? (
          <div className="empty-notes">
            <p>No notes yet</p>
          </div>
        ) : (
          notes.map((note) => {
            const isHighlighted = highlightedNoteId === note.id;
            return (
              <div
                key={note.id}
                data-note-id={note.id}
                className={`note-item note-item-full ${isHighlighted ? 'selected' : ''}`}
                onClick={(e) => handleNoteClick(note, e)}
              >
                <div className="note-item-header">
                  <span className="note-date">{formatDate(note.updatedAt)}</span>
                  <button
                    className="btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this note? This cannot be undone.')) {
                        onDeleteNote(note.id);
                      }
                    }}
                  >
                    ×
                  </button>
                </div>

                <MarkdownWYSIWYG
                  value={note.content}
                  onChange={(newContent) => handleContentChange(note, newContent)}
                  onFocus={() => handleEditorFocus(note.id)}
                  onBlur={handleEditorBlur}
                  placeholder="Type your note here..."
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NoteList;
