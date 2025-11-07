import React, { useRef, useEffect, useState, KeyboardEvent, ClipboardEvent } from 'react';

interface MarkdownWYSIWYGProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

interface CursorPosition {
  offset: number;
  isAtEnd: boolean;
}

export const MarkdownWYSIWYG: React.FC<MarkdownWYSIWYGProps> = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  onFocus,
  onBlur
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isUpdatingRef = useRef(false);
  const valueRef = useRef(value);
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComposingRef = useRef(false);

  // Update valueRef when value changes
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }
    };
  }, []);

  // Parse Markdown dan apply styling
  const parseMarkdown = (text: string): string => {
    // Split by lines first to process line by line
    const lines = text.split('\n');
    const processedLines = lines.map((line) => {
      // Don't trim - preserve all whitespace (user might be typing)
      let html = line;

      // Escape HTML untuk keamanan
      html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Track if this is a block-level element (skip inline formatting)
      let isBlockElement = false;

      // Headers (# ## ###) - must be at start of line (with optional leading spaces)
      if (/^\s*#{1,6}\s+/.test(html)) {
        html = html.replace(
          /^\s*(#{1,6})\s+(.*)$/,
          (_match, hashes, content) => {
            const level = hashes.length;
            return `<span class="md-syntax md-header-syntax">${hashes}</span> <span class="md-header md-header-${level}">${content}</span>`;
          }
        );
        isBlockElement = true;
      }
      // Todo lists (- [ ] or - [x] or - []) - MUST CHECK BEFORE regular lists
      else if (/^(\s*)[-*]\s+\[([ xX]?)\]\s*/.test(html)) {
        html = html.replace(
          /^(\s*)([-*])\s+\[([ xX]?)\]\s*(.*)$/,
          (_match, indent, marker, check, content) => {
            const isChecked = check.toLowerCase() === 'x';
            const checkboxClass = isChecked ? 'md-todo-checkbox-checked' : 'md-todo-checkbox-unchecked';
            const textClass = isChecked ? 'md-todo-text-checked' : '';
            // Use simple structure with data attributes for toggle
            return `${indent}<span class="md-todo-checkbox ${checkboxClass}" data-todo="true" contenteditable="false"></span> <span class="md-todo-text ${textClass}">${content}</span>`;
          }
        );
      }
      // Lists (- atau * atau 1.) - must be at start of line
      else if (/^(\s*)([-*]|\d+\.)\s+/.test(html)) {
        html = html.replace(
          /^(\s*)([-*]|\d+\.)\s+(.*)$/,
          '$1<span class="md-syntax md-list-marker">$2</span> <span class="md-list-item">$3</span>'
        );
      }
      // Blockquote (>) - must be at start of line
      else if (/^>\s+/.test(html)) {
        html = html.replace(
          /^>\s+(.*)$/,
          '<span class="md-syntax md-quote-marker">&gt;</span> <span class="md-quote">$1</span>'
        );
      }
      // Horizontal rule (---) - must be entire line
      else if (/^---+$/.test(html)) {
        html = '<span class="md-hr">---</span>';
      }

      // Inline formatting (works within lines) - skip for block elements
      if (!isBlockElement) {
        // Bold (**text** atau __text__)
        html = html.replace(
          /(\*\*|__)([^\*_\n]+?)\1/g,
          '<span class="md-syntax">$1</span><span class="md-bold">$2</span><span class="md-syntax">$1</span>'
        );

      // Italic (*text* atau _text_) - more specific to avoid conflicts
      html = html.replace(
        /(?<!\*)(\*)(?!\*)([^\*\n]+?)\1(?!\*)/g,
        '<span class="md-syntax">*</span><span class="md-italic">$2</span><span class="md-syntax">*</span>'
      );
      html = html.replace(
        /(?<!_)(_)(?!_)([^_\n]+?)\1(?!_)/g,
        '<span class="md-syntax">_</span><span class="md-italic">$2</span><span class="md-syntax">_</span>'
      );

      // Strikethrough (~~text~~)
      html = html.replace(
        /~~([^~\n]+?)~~/g,
        '<span class="md-syntax">~~</span><span class="md-strikethrough">$1</span><span class="md-syntax">~~</span>'
      );

      // Inline code (`code`)
      html = html.replace(
        /`([^`\n]+)`/g,
        '<span class="md-syntax md-code-syntax">`</span><span class="md-code">$1</span><span class="md-syntax md-code-syntax">`</span>'
      );

      // Links ([text](url))
      html = html.replace(
        /\[([^\]\n]+)\]\(([^)\n]+)\)/g,
        '<span class="md-syntax">[</span><span class="md-link-text">$1</span><span class="md-syntax">](</span><span class="md-link-url">$2</span><span class="md-syntax">)</span>'
      );
      } // End of inline formatting block

      // If line is empty, preserve with &nbsp; to maintain proper line spacing
      if (!html.trim() || html === '&nbsp;') {
        return '&nbsp;';
      }

      return html;
    });

    // Join lines with <br> - this creates visual line breaks for every \n
    return processedLines.join('<br>');
  };

  // Get cursor position as character offset in plain text
  const getCursorPosition = (): CursorPosition | null => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const textBeforeCursor = getPlainTextFromRange(preCaretRange);
    const totalText = getPlainText(editorRef.current);

    return {
      offset: textBeforeCursor.length,
      isAtEnd: textBeforeCursor.length === totalText.length
    };
  };

  // Set cursor position by character offset
  const setCursorPosition = (targetOffset: number) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    let currentOffset = 0;

    const findPosition = (node: Node): { node: Node; offset: number } | null => {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.textContent || '';
        // Normalize &nbsp; to match getPlainText behavior
        const normalized = content.replace(/\u00A0/g, '');
        const textLength = normalized.length;

        if (currentOffset + textLength >= targetOffset) {
          return {
            node,
            offset: targetOffset - currentOffset
          };
        }
        currentOffset += textLength;
      } else if (node.nodeName === 'BR') {
        if (currentOffset >= targetOffset) {
          // Set cursor before BR
          if (node.parentNode) {
            const parent = node.parentNode;
            const index = Array.from(parent.childNodes).indexOf(node as ChildNode);
            return { node: parent, offset: index };
          }
        }
        currentOffset += 1;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;

        // Special handling for todo checkbox - it represents "- [ ] " or "- [x] " (6 chars)
        if (el.classList?.contains('md-todo-checkbox')) {
          const checkboxLength = 6; // "- [ ] " or "- [x] "
          if (currentOffset + checkboxLength >= targetOffset) {
            // Target is within checkbox area, position cursor after checkbox (in the text span)
            const nextSibling = node.nextSibling;
            if (nextSibling) {
              // Skip the space after checkbox
              if (nextSibling.nodeType === Node.TEXT_NODE && nextSibling.textContent === ' ') {
                const afterSpace = nextSibling.nextSibling;
                if (afterSpace) {
                  // Position at start of todo text
                  if (afterSpace.nodeType === Node.ELEMENT_NODE) {
                    const firstText = (afterSpace as HTMLElement).querySelector('.md-todo-text')?.firstChild;
                    if (firstText) {
                      return { node: firstText, offset: 0 };
                    }
                  }
                  return { node: afterSpace, offset: 0 };
                }
              }
              return { node: nextSibling, offset: 0 };
            }
          }
          currentOffset += checkboxLength;
          return null; // Don't traverse children of checkbox (it's contenteditable=false)
        }

        for (let i = 0; i < node.childNodes.length; i++) {
          const result = findPosition(node.childNodes[i]);
          if (result) return result;
        }
      }
      return null;
    };

    const position = findPosition(editorRef.current);

    if (position) {
      try {
        const range = document.createRange();
        if (position.node.nodeType === Node.TEXT_NODE) {
          range.setStart(position.node, Math.min(position.offset, position.node.textContent?.length || 0));
        } else {
          range.setStart(position.node, position.offset);
        }
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {
        // Fallback: set cursor at end
        try {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (err) {
          // Ignore if this also fails
        }
      }
    } else {
      // If no position found, set to end
      try {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (err) {
        // Ignore
      }
    }
  };

  // Extract plain text dari HTML (untuk mendapatkan Markdown asli)
  const getPlainText = (element: HTMLElement): string => {
    let text = '';

    const traverse = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.textContent || '';
        // Normalize &nbsp; (U+00A0) to empty string for proper line handling
        // &nbsp; is used for empty line preservation in HTML, but should be "" in plain text
        const normalized = content.replace(/\u00A0/g, '');
        text += normalized;
      } else if (node.nodeName === 'BR') {
        text += '\n';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;

        // Special handling for todo checkboxes
        if (el.classList?.contains('md-todo-checkbox')) {
          // Add "- " prefix before checkbox
          text += '- ';
          // Check if it's checked or unchecked
          const isChecked = el.classList.contains('md-todo-checkbox-checked');
          text += isChecked ? '[x] ' : '[ ] ';
          return; // Don't traverse children (checkbox is empty or has ::before content)
        }

        const children = node.childNodes;
        for (let i = 0; i < children.length; i++) {
          traverse(children[i]);
        }
      }
    };

    traverse(element);
    return text;
  };

  // Get plain text from a range
  const getPlainTextFromRange = (range: Range): string => {
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    return getPlainText(container);
  };

  // Update editor content ketika value berubah dari luar
  useEffect(() => {
    // Skip update if we're in the middle of handling user input
    if (editorRef.current && !isUpdatingRef.current) {
      const currentPlainText = getPlainText(editorRef.current);

      // Only update if the value actually differs from current content
      // This prevents race condition and unnecessary updates during typing
      if (currentPlainText !== value) {
        const parsed = parseMarkdown(value);
        editorRef.current.innerHTML = parsed || '';
      }
    }
  }, [value]);

  // Force initial parse on mount
  useEffect(() => {
    if (editorRef.current && value) {
      const parsed = parseMarkdown(value);
      editorRef.current.innerHTML = parsed;
    }
  }, []);

  // Re-parse and update markdown styling
  const reparseContent = () => {
    if (!editorRef.current || isUpdatingRef.current || isComposingRef.current) {
      return;
    }

    isUpdatingRef.current = true;

    // Save cursor position and scroll BEFORE any DOM changes
    const cursorPos = getCursorPosition();
    const scrollTop = editorRef.current.scrollTop;

    // Get the latest plain text
    const currentPlainText = getPlainText(editorRef.current);

    // Parse and update HTML
    const parsed = parseMarkdown(currentPlainText);

    // Only update if parsed result is different
    if (editorRef.current.innerHTML !== parsed) {
      editorRef.current.innerHTML = parsed;

      // Restore cursor position AFTER DOM update
      if (cursorPos) {
        requestAnimationFrame(() => {
          if (editorRef.current) {
            setCursorPosition(cursorPos.offset);
            editorRef.current.scrollTop = scrollTop;
          }
          isUpdatingRef.current = false;
        });
      } else {
        isUpdatingRef.current = false;
      }
    } else {
      isUpdatingRef.current = false;
    }
  };

  // Handle input changes with aggressive debouncing to prevent race conditions
  const handleInput = () => {
    // Prevent processing if already updating or composing
    if (isUpdatingRef.current || !editorRef.current || isComposingRef.current) {
      return;
    }

    // Clear any pending input handling
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }

    // Get plain text immediately for onChange
    const plainText = getPlainText(editorRef.current);

    // Check if content actually changed
    if (plainText === valueRef.current) {
      return;
    }

    // Update the value immediately (without re-parsing)
    onChange(plainText);
    valueRef.current = plainText;

    // Debounce the DOM re-parsing to avoid cursor issues during rapid typing
    inputTimeoutRef.current = setTimeout(() => {
      reparseContent();
    }, 300); // Wait 300ms after last keystroke before re-parsing
  };

  // Handle composition events (for IME input)
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    // Re-parse after composition ends
    setTimeout(() => reparseContent(), 50);
  };

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Cmd/Ctrl + B untuk bold
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      insertMarkdownSyntax('**', '**');
      return;
    }

    // Cmd/Ctrl + I untuk italic
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      insertMarkdownSyntax('*', '*');
      return;
    }

    // Cmd/Ctrl + K untuk code
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      insertMarkdownSyntax('`', '`');
      return;
    }

    // Handle Enter key - manually insert newline
    if (e.key === 'Enter') {
      e.preventDefault();

      if (!editorRef.current) return;

      // Get cursor position
      const cursorPos = getCursorPosition();
      if (!cursorPos) return;

      const plainText = getPlainText(editorRef.current);

      // Get current line to check for list markers
      const beforeCursor = plainText.slice(0, cursorPos.offset);
      const afterCursor = plainText.slice(cursorPos.offset);
      const lines = beforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      let newText = '';
      let newCursorOffset = cursorPos.offset + 1; // default: after newline

      // Check if current line is a todo list item
      const todoMatch = currentLine.match(/^(\s*)([-*])\s+\[([ xX]?)\]\s*(.*)$/);
      // Check if current line is a regular list item
      const bulletMatch = currentLine.match(/^(\s*)([-*])\s+(.*)$/);
      const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);

      if (todoMatch) {
        const [, indent, marker, , content] = todoMatch;

        // If line has content, continue the todo list with unchecked box
        if (content.trim()) {
          newText = beforeCursor + '\n' + indent + marker + ' [ ] ' + afterCursor;
          newCursorOffset = cursorPos.offset + 1 + indent.length + marker.length + 5; // after "- [ ] "
        }
        // If line is empty (just marker and checkbox), break the list
        else {
          // Remove the empty todo list marker and just insert newline
          const withoutMarker = lines.slice(0, -1).join('\n');
          newText = withoutMarker + (withoutMarker ? '\n' : '') + '\n' + afterCursor;
          newCursorOffset = withoutMarker.length + (withoutMarker ? 1 : 0) + 1;
        }
      }
      else if (bulletMatch) {
        const [, indent, marker, content] = bulletMatch;

        // If line has content, continue the list
        if (content.trim()) {
          newText = beforeCursor + '\n' + indent + marker + ' ' + afterCursor;
          newCursorOffset = cursorPos.offset + 1 + indent.length + marker.length + 1; // after "- "
        }
        // If line is empty (just marker), break the list
        else {
          // Remove the empty list marker and just insert newline
          const withoutMarker = lines.slice(0, -1).join('\n');
          newText = withoutMarker + (withoutMarker ? '\n' : '') + '\n' + afterCursor;
          newCursorOffset = withoutMarker.length + (withoutMarker ? 1 : 0) + 1;
        }
      }
      else if (numberedMatch) {
        const [, indent, number, content] = numberedMatch;

        // If line has content, continue the list with incremented number
        if (content.trim()) {
          const nextNumber = parseInt(number) + 1;
          newText = beforeCursor + '\n' + indent + nextNumber + '. ' + afterCursor;
          newCursorOffset = cursorPos.offset + 1 + indent.length + nextNumber.toString().length + 2; // after "2. "
        }
        // If line is empty (just marker), break the list
        else {
          // Remove the empty list marker and just insert newline
          const withoutMarker = lines.slice(0, -1).join('\n');
          newText = withoutMarker + (withoutMarker ? '\n' : '') + '\n' + afterCursor;
          newCursorOffset = withoutMarker.length + (withoutMarker ? 1 : 0) + 1;
        }
      }
      // Regular newline (no list)
      else {
        newText = beforeCursor + '\n' + afterCursor;
        newCursorOffset = cursorPos.offset + 1;
      }

      // Update content
      onChange(newText);
      valueRef.current = newText;

      // Parse and update DOM immediately
      const parsed = parseMarkdown(newText);
      editorRef.current.innerHTML = parsed;

      // Set cursor position after newline
      setTimeout(() => {
        setCursorPosition(newCursorOffset);
      }, 0);

      return;
    }
  };

  // Handle paste events
  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Insert Markdown syntax around selection
  const insertMarkdownSyntax = (before: string, after: string) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    // Get cursor position
    const cursorPos = getCursorPosition();
    if (!cursorPos) return;

    const plainText = getPlainText(editorRef.current);

    // Calculate new text with syntax inserted
    const beforeCursor = plainText.slice(0, cursorPos.offset - selectedText.length);
    const afterCursor = plainText.slice(cursorPos.offset);
    const newText = beforeCursor + before + selectedText + after + afterCursor;

    // Update content
    onChange(newText);
    valueRef.current = newText;

    // Set cursor position after the inserted syntax
    Promise.resolve().then(() => {
      const newCursorPos = cursorPos.offset - selectedText.length + before.length + selectedText.length;
      setCursorPosition(newCursorPos);
    });
  };

  // Re-parse when losing focus
  const handleBlur = () => {
    setIsFocused(false);
    // Force re-parse when losing focus to ensure all styling is applied
    setTimeout(() => reparseContent(), 50);
    // Call onBlur callback if provided
    if (onBlur) {
      onBlur();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Call onFocus callback if provided
    if (onFocus) {
      onFocus();
    }
  };

  // Handle click events for todo checkboxes
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Check if clicked element is a todo checkbox
    if (target.dataset.todo === 'true') {
      e.preventDefault();

      if (!editorRef.current) return;

      // Get the plain text content
      const plainText = getPlainText(editorRef.current);
      const lines = plainText.split('\n');

      // Count <br> elements before the clicked element to determine line number
      let clickedLineIndex = 0;
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_ELEMENT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node === target) break;
        if (node.nodeName === 'BR') clickedLineIndex++;
      }

      // Toggle the checkbox in the plain text
      if (clickedLineIndex >= 0 && clickedLineIndex < lines.length) {
        const line = lines[clickedLineIndex];
        let newLine = line;

        // Toggle [] or [ ] to [x], or [x]/[X] to [ ]
        if (/^(\s*)[-*]\s+\[\s*\]\s*/.test(line)) {
          newLine = line.replace(/^(\s*[-*]\s+)\[\s*\](\s*)/, '$1[x]$2');
        } else if (/^(\s*)[-*]\s+\[[xX]\]\s*/.test(line)) {
          newLine = line.replace(/^(\s*[-*]\s+)\[[xX]\](\s*)/, '$1[ ]$2');
        }

        // Update the line
        lines[clickedLineIndex] = newLine;
        const newText = lines.join('\n');

        // Update content
        onChange(newText);
        valueRef.current = newText;

        // Re-parse immediately
        setTimeout(() => reparseContent(), 0);
      }
    }
  };

  return (
    <div className="markdown-wysiwyg-container">
      <div
        ref={editorRef}
        className="markdown-wysiwyg-editor"
        contentEditable
        onInput={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={handleClick}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
};
