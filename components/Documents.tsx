import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import type { Task } from '../types';
import { InfoTooltip, PencilIcon, FullScreenIcon, ExitFullScreenIcon } from './UI';

type DocumentType = 'planning' | 'implementation' | 'scratchpad';

// Simple Markdown to HTML converter
const markdownToHtml = (text: string): string => {
    const escapeHtml = (unsafe: string) => {
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    
    const applyInlineFormatting = (str: string) => {
        // Important: process bold (**) before italic (*) to avoid conflicts.
        return escapeHtml(str)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    let inList = false;
    const lines = text.split('\n');
    let html = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Close list if current line is not a list item and we are in a list
        const isListItem = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ');
        if (inList && !isListItem) {
            html += '</ul>';
            inList = false;
        }

        // Headers
        if (trimmedLine.startsWith('#')) {
            const match = trimmedLine.match(/^(#{1,4})\s(.*)$/);
            if (match) {
                const level = match[1].length;
                const content = match[2];
                html += `<h${level}>${applyInlineFormatting(content)}</h${level}>`;
                continue;
            }
        }
        
        // Unordered lists
        if (isListItem) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${applyInlineFormatting(trimmedLine.substring(2))}</li>`;
        } else if (trimmedLine !== '') {
            // Paragraphs
            html += `<p>${applyInlineFormatting(line)}</p>`;
        } else {
            // Empty lines, but not inside a list
            if (!inList) {
               html += '<br />';
            }
        }
    }

    if (inList) {
        html += '</ul>';
    }
    return html;
};


// Autocomplete and text processing helpers
const generateNextTaskId = (subPhase: string, allTasks: Task[]): string | null => {
    const tasksInSubPhase = allTasks.filter(t => t.subPhase.toLowerCase() === subPhase.toLowerCase());
    if (tasksInSubPhase.length === 0) return null;
    const sampleId = tasksInSubPhase[0].id;
    const match = sampleId.match(/^([a-zA-Z0-9]+)-(\d+)$/);
    if (!match) return null;
    const prefix = match[1];
    let maxNum = 0;
    allTasks.forEach(t => {
        const taskMatch = t.id.match(new RegExp(`^${prefix}-(\\d+)$`));
        if (taskMatch) {
            const num = parseInt(taskMatch[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });
    const newNum = maxNum + 1;
    return `${prefix}-${String(newNum).padStart(2, '0')}`;
};

const getCursorCoordinates = (textarea: HTMLTextAreaElement): { top: number; left: number } => {
    if (!textarea) return { top: 0, left: 0 };
    const { value, selectionStart, scrollLeft, scrollTop } = textarea;
    const div = document.createElement('div');
    document.body.appendChild(div);
    const style = window.getComputedStyle(textarea);
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'width', 'boxSizing'].forEach(prop => {
        div.style[prop] = style[prop];
    });
    const textBeforeCursor = value.substring(0, selectionStart);
    div.textContent = textBeforeCursor;
    const span = document.createElement('span');
    span.textContent = '\u200b';
    div.appendChild(span);
    const textareaRect = textarea.getBoundingClientRect();
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    const top = textareaRect.top + (span.offsetTop - scrollTop) + lineHeight;
    const left = textareaRect.left + (span.offsetLeft - scrollLeft);
    document.body.removeChild(div);
    return { top, left };
};

// --- EDITABLE DOCUMENT PANEL ---
interface EditableDocumentPanelProps {
  title: string;
  content: string;
  onContentChange: (newContent: string) => void;
  onTextSelection?: (selectedText: string) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLTextAreaElement | HTMLDivElement>) => void;
  docType: DocumentType;
  allTasks?: Task[];
  accessory?: React.ReactNode;
  isEditing: boolean;
  onToggleEdit: () => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}

export const EditableDocumentPanel: React.FC<EditableDocumentPanelProps> = ({ title, content, onContentChange, onTextSelection, onContextMenu, docType, allTasks, accessory, isEditing, onToggleEdit, isFullScreen, onToggleFullScreen }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState<{ top: number; left: number } | null>(null);

  const renderedHtml = useMemo(() => markdownToHtml(content), [content]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) {
        onToggleFullScreen();
        event.preventDefault();
        event.stopPropagation();
      }
    };
    if (isFullScreen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isFullScreen, onToggleFullScreen]);

  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (onTextSelection && textAreaRef.current) {
      const selectedText = textAreaRef.current.value.substring(textAreaRef.current.selectionStart, textAreaRef.current.selectionEnd);
      if (selectedText) onTextSelection(selectedText);
    }
  };

  const applySuggestion = useCallback((index: number) => {
      const selectedSuggestion = suggestions[index];
      if (!selectedSuggestion || !allTasks || !textAreaRef.current) return;
      const { value, selectionStart } = textAreaRef.current;
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.substring(lineStart, selectionStart);
      const taskContent = currentLine.trim().substring(2).trim();
      const replaceFrom = selectionStart - taskContent.length;
      const newId = generateNextTaskId(selectedSuggestion, allTasks) || '';
      const replacement = `${selectedSuggestion}, ${newId}, `;
      const newValue = value.substring(0, replaceFrom) + replacement + value.substring(selectionStart);
      onContentChange(newValue);
      setTimeout(() => {
          if (textAreaRef.current) {
              const newCursorPos = replaceFrom + replacement.length;
              textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = newCursorPos;
          }
      }, 0);
      setShowSuggestions(false);
  }, [suggestions, allTasks, onContentChange]);

  const handleContentChangeAndAutocomplete = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = e.target;
      const { value, selectionStart } = textarea;
      onContentChange(value);
      if (docType !== 'implementation' || !allTasks) {
          setShowSuggestions(false);
          return;
      }
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.substring(lineStart, selectionStart);
      if (!currentLine.trim().startsWith('- ')) {
          setShowSuggestions(false);
          return;
      }
      const parts = currentLine.substring(currentLine.indexOf('- ') + 2).split(',');
      if (parts.length === 1) {
          const currentSubPhase = parts[0].trim();
          if (currentSubPhase.length === 0) {
              setShowSuggestions(false);
              return;
          }
          const uniqueSubPhases = [...new Set(allTasks.map(t => t.subPhase))];
          const filteredSuggestions = uniqueSubPhases.filter(sp => sp.toLowerCase().startsWith(currentSubPhase.toLowerCase()) && sp.toLowerCase() !== currentSubPhase.toLowerCase());
          if (filteredSuggestions.length > 0) {
              const coords = getCursorCoordinates(textarea);
              setSuggestionPosition(coords);
              setSuggestions(filteredSuggestions);
              setShowSuggestions(true);
              setActiveSuggestionIndex(0);
          } else {
              setShowSuggestions(false);
          }
      } else {
          setShowSuggestions(false);
      }
  }, [allTasks, docType, onContentChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions) {
          if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
          } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          } else if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault();
              applySuggestion(activeSuggestionIndex);
          }
          return;
      }
      if (docType === 'implementation' && event.key === 'Enter') {
          const { value, selectionStart } = event.currentTarget;
          const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
          const currentLineText = value.substring(lineStart, selectionStart);
          if (currentLineText.trim().startsWith('- ')) {
              event.preventDefault();
              const newValue = value.slice(0, selectionStart) + '\n- ' + value.slice(selectionStart);
              onContentChange(newValue);
              setTimeout(() => {
                  if (textAreaRef.current) {
                      const newCursorPos = selectionStart + 3;
                      textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = newCursorPos;
                  }
              }, 0);
          }
      }
  }, [showSuggestions, activeSuggestionIndex, suggestions, applySuggestion, docType, onContentChange]);

  const rootClasses = isFullScreen
    ? "fixed inset-0 bg-primary z-[100] p-4 flex flex-col"
    : "bg-secondary/50 rounded-lg p-4 flex flex-col h-full border border-secondary";

  return (
    <div className={rootClasses} role={isFullScreen ? "dialog" : undefined} aria-modal={isFullScreen}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-secondary">{title}</h2>
          {accessory}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggleEdit} className={`p-1.5 rounded-md transition-colors ${isEditing ? 'bg-accent text-accent-text' : 'text-secondary hover:text-primary hover:bg-hover'}`} title={isEditing ? "Switch to View Mode" : "Switch to Edit Mode"}>
            <PencilIcon />
          </button>
          <button onClick={onToggleFullScreen} className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-hover transition-colors" title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}>
            {isFullScreen ? <ExitFullScreenIcon /> : <FullScreenIcon />}
          </button>
        </div>
      </div>
      
      {isEditing ? (
        <textarea
          ref={textAreaRef}
          value={content}
          onChange={handleContentChangeAndAutocomplete}
          onKeyDown={handleKeyDown}
          onMouseUp={onTextSelection ? handleMouseUp : undefined}
          onContextMenu={onContextMenu}
          className="w-full flex-grow min-h-0 bg-secondary rounded-md p-3 text-primary resize-none focus:ring-2 focus:ring-accent outline-none border border-secondary"
          spellCheck="false"
          autoFocus={!isFullScreen} // Only autofocus on initial inline edit
        />
      ) : (
        <div 
          className="w-full flex-grow min-h-0 text-primary overflow-y-auto markdown-preview p-3"
          onContextMenu={onContextMenu}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      )}

      {showSuggestions && suggestionPosition && (
        <div 
            className="fixed z-[101] bg-tertiary border border-secondary rounded-md shadow-lg w-full max-w-xs"
            style={{ top: suggestionPosition.top, left: suggestionPosition.left }}
        >
          <ul className="py-1 max-h-48 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion}
                className={`px-4 py-2 cursor-pointer text-sm ${index === activeSuggestionIndex ? 'bg-accent text-accent-text' : 'hover:bg-hover text-primary'}`}
                onClick={() => applySuggestion(index)}
                onMouseEnter={() => setActiveSuggestionIndex(index)}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const implementationPlanHelpText = (
  <div className="text-left">
    <p className="font-bold mb-2">Formatting Guide:</p>
    <pre className="text-xs bg-secondary p-2 rounded font-mono whitespace-pre-wrap">
      <code>
{`# Status (e.g., To-Do)
## Phase Name (e.g., Backend)
- SubPhase, Task-ID, Description, Priority`}
      </code>
    </pre>
    <p className="font-bold mt-3 mb-1">Example:</p>
    <pre className="text-xs bg-secondary p-2 rounded font-mono whitespace-pre-wrap">
    <code>
{`# To-Do
## Backend
- Database, DB-01, Setup schema, High`}
    </code>
    </pre>
  </div>
);