import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, X, FileText } from 'lucide-react';
import { api } from '@/lib/api';

interface CodeEditorPanelProps {
  projectPath: string;
  filePath?: string;
}

const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({ projectPath, filePath: initialFilePath }) => {
  const [filePath, setFilePath] = useState<string | null>(initialFilePath || null);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isModified = content !== originalContent;

  const loadFile = useCallback(async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      const fileContent = await api.readFileContent(path);
      setContent(fileContent);
      setOriginalContent(fileContent);
      setFilePath(path);
    } catch (err: any) {
      setError(err.message || 'Failed to read file');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialFilePath) {
      loadFile(initialFilePath);
    }
  }, [initialFilePath, loadFile]);

  // Listen for file open events from the FileTree
  useEffect(() => {
    const handleOpenFile = (e: CustomEvent) => {
      const { filePath: path } = e.detail;
      if (path) loadFile(path);
    };
    window.addEventListener('open-file-in-editor', handleOpenFile as EventListener);
    return () => window.removeEventListener('open-file-in-editor', handleOpenFile as EventListener);
  }, [loadFile]);

  const saveFile = async () => {
    if (!filePath) return;
    try {
      await api.writeFileContent(filePath, content);
      setOriginalContent(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save file');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFile();
    }
    // Tab key inserts spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  const getFileName = () => {
    if (!filePath) return '';
    return filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
  };

  const getLineCount = () => content.split('\n').length;

  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Open a file from the file tree to edit</p>
          <p className="text-xs mt-1 opacity-60">Or use Ctrl+O to open a file</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Loading file...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={() => filePath && loadFile(filePath)} className="text-xs mt-2 underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* File header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border text-xs">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">{getFileName()}</span>
        {isModified && <span className="text-yellow-400">*</span>}
        {saved && <span className="text-green-400 text-[10px]">Saved</span>}
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground">{getLineCount()} lines</span>
        <button
          onClick={saveFile}
          disabled={!isModified}
          className={`p-1 rounded ${isModified ? 'hover:bg-accent text-foreground' : 'text-muted-foreground/30'}`}
          title="Save (Ctrl+S)"
        >
          <Save className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { setFilePath(null); setContent(''); setOriginalContent(''); }}
          className="p-1 rounded hover:bg-accent text-muted-foreground"
          title="Close file"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden flex">
        {/* Line numbers */}
        <div className="bg-muted/30 px-2 py-2 text-right select-none overflow-hidden">
          {content.split('\n').map((_, i) => (
            <div key={i} className="text-[11px] leading-5 text-muted-foreground/40 font-mono">
              {i + 1}
            </div>
          ))}
        </div>
        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[13px] leading-5 font-mono p-2 outline-none resize-none overflow-auto"
          spellCheck={false}
          wrap="off"
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center px-3 py-0.5 border-t border-border text-[10px] text-muted-foreground gap-3">
        <span className="truncate max-w-[50%]">{filePath}</span>
        <span className="ml-auto">Ctrl+S to save</span>
      </div>
    </div>
  );
};

export default CodeEditorPanel;
