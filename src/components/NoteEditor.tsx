import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Note } from '../types/note';
import { MarkdownWYSIWYG } from './MarkdownWYSIWYG';

interface NoteEditorProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
}

interface MarkdownContentProps {
  content: string;
  onCheckboxToggle: (lineIndex: number) => void;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, onCheckboxToggle }) => {
  const lines = content.split('\n');
  const checkboxLines: number[] = [];

  // Find all checkbox lines
  lines.forEach((line, index) => {
    if (line.match(/^(\s*[-*+]\s+\[)([ xX])(\])/)) {
      checkboxLines.push(index);
    }
  });

  let currentCheckboxIndex = -1;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        input: ({ node, checked, ...props }) => {
          if (props.type === 'checkbox') {
            currentCheckboxIndex++;
            const lineIndex = checkboxLines[currentCheckboxIndex];
            return (
              <input
                type="checkbox"
                checked={checked || false}
                onChange={() => onCheckboxToggle(lineIndex)}
                className="markdown-checkbox"
              />
            );
          }
          return <input {...props} />;
        },
        li: ({ node, children, ...props }) => {
          const hasCheckbox = node?.children?.some(
            (child: any) => child.type === 'element' && child.tagName === 'input'
          );
          if (hasCheckbox) {
            return (
              <li className="task-list-item" {...props}>
                {children}
              </li>
            );
          }
          return <li {...props}>{children}</li>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onUpdateNote }) => {
  const [content, setContent] = useState(note.content);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [editMode, setEditMode] = useState<'wysiwyg' | 'preview'>('wysiwyg');
  const editorContentRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle scrollbar auto-hide
  useEffect(() => {
    const editorContent = editorContentRef.current;
    if (!editorContent) return;

    // Remove any existing scrolling class on mount
    editorContent.classList.remove('scrolling');

    const handleScroll = () => {
      editorContent.classList.add('scrolling');

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        editorContent.classList.remove('scrolling');
      }, 3000);
    };

    editorContent.addEventListener('scroll', handleScroll);

    return () => {
      editorContent.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Clean up scrolling class on unmount
      editorContent.classList.remove('scrolling');
    };
  }, [note]); // Re-run when note changes

  useEffect(() => {
    // Update local state when note changes
    setContent(note.content);

    // Clear any pending save timeout when switching notes
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      setSaveTimeout(null);
    }
  }, [note.id, note.content]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    autoSave(newContent);
  };

  const autoSave = (newContent: string) => {
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for auto-save
    const timeout = setTimeout(() => {
      const updatedNote: Note = {
        ...note,
        content: newContent,
        updatedAt: new Date(),
        isDirty: true,
      };
      onUpdateNote(updatedNote);
    }, 2000);

    setSaveTimeout(timeout);
  };

  const handleCheckboxToggle = (lineIndex: number) => {
    const lines = content.split('\n');
    const line = lines[lineIndex];

    if (line && line.match(/^(\s*[-*+]\s+\[)([ xX])(\])/)) {
      // Toggle checkbox
      const isChecked = line.match(/\[[xX]\]/);
      lines[lineIndex] = isChecked
        ? line.replace(/\[[xX]\]/, '[ ]')
        : line.replace(/\[ \]/, '[x]');

      const newContent = lines.join('\n');
      setContent(newContent);

      // Save immediately
      const updatedNote: Note = {
        ...note,
        content: newContent,
        updatedAt: new Date(),
        isDirty: true,
      };
      onUpdateNote(updatedNote);
    }
  };

  return (
    <div className="note-editor">
      <div className="editor-header">
        <div className="editor-mode-toggle" style={{ display: 'flex', flexShrink: 0 }}>
          <button
            className={`mode-btn ${editMode === 'wysiwyg' ? 'active' : ''}`}
            onClick={() => setEditMode('wysiwyg')}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Edit
          </button>
          <button
            className={`mode-btn ${editMode === 'preview' ? 'active' : ''}`}
            onClick={() => setEditMode('preview')}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Preview
          </button>
        </div>
      </div>

      <div ref={editorContentRef} className="editor-content-single">
        {editMode === 'wysiwyg' ? (
          <MarkdownWYSIWYG
            value={content}
            onChange={handleContentChange}
            placeholder="Start typing your markdown note..."
          />
        ) : (
          <div className="markdown-preview-single">
            {content ? (
              <MarkdownContent
                content={content}
                onCheckboxToggle={handleCheckboxToggle}
              />
            ) : (
              <div className="empty-preview">
                <p>No content yet. Switch to Edit mode to start writing.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="editor-footer">
        <span className="last-updated">
          Last updated: {note.updatedAt.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default NoteEditor;
