import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  FolderOpen,
  FileText,
  Search,
  Terminal,
  FileEdit,
  ChevronRight,
  GitBranch,
  X,
  Info,
  AlertCircle,
  Settings,
  FolderSearch,
  List,
  LogOut,
  Edit3,
  FilePlus,
  Book,
  BookOpen,
  Globe,
  ListChecks,
  ListPlus,
  Globe2,
  Package,
  ChevronDown,
  Package2,
  Wrench,
  CheckSquare,
  type LucideIcon,
  Sparkles,
  Zap,
  FileCode,
  Folder,
  ChevronUp,
  BarChart3,
  Download,
  LayoutGrid,
  LayoutList,
  Activity,
  Hash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { getClaudeSyntaxTheme } from "@/lib/claudeSyntaxTheme";
import { useTheme } from "@/hooks";
import { Button } from "@/components/ui/button";
import * as Diff from 'diff';
import { detectLinks, makeLinksClickable } from "@/lib/linkDetector";
import ReactMarkdown from "react-markdown";
import { open } from "@tauri-apps/plugin-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// Tool Card System — Shared collapsible card for all tool widgets
// ============================================================================

const TOOL_COLORS = {
  read:   { border: 'border-blue-500/20',    bg: 'bg-blue-500/5',    hover: 'hover:bg-blue-500/10',    icon: 'text-blue-500',    divider: 'border-blue-500/15' },
  edit:   { border: 'border-orange-500/20',   bg: 'bg-orange-500/5',   hover: 'hover:bg-orange-500/10',   icon: 'text-orange-500',   divider: 'border-orange-500/15' },
  bash:   { border: 'border-green-500/20',    bg: 'bg-green-500/5',    hover: 'hover:bg-green-500/10',    icon: 'text-green-500',    divider: 'border-green-500/15' },
  grep:   { border: 'border-emerald-500/20',  bg: 'bg-emerald-500/5',  hover: 'hover:bg-emerald-500/10',  icon: 'text-emerald-500',  divider: 'border-emerald-500/15' },
  glob:   { border: 'border-amber-500/20',    bg: 'bg-amber-500/5',    hover: 'hover:bg-amber-500/10',    icon: 'text-amber-500',    divider: 'border-amber-500/15' },
  ls:     { border: 'border-cyan-500/20',     bg: 'bg-cyan-500/5',     hover: 'hover:bg-cyan-500/10',     icon: 'text-cyan-500',     divider: 'border-cyan-500/15' },
  write:  { border: 'border-purple-500/20',   bg: 'bg-purple-500/5',   hover: 'hover:bg-purple-500/10',   icon: 'text-purple-500',   divider: 'border-purple-500/15' },
  mcp:    { border: 'border-violet-500/20',   bg: 'bg-violet-500/5',   hover: 'hover:bg-violet-500/10',   icon: 'text-violet-500',   divider: 'border-violet-500/15' },
  task:   { border: 'border-purple-500/20',   bg: 'bg-purple-500/5',   hover: 'hover:bg-purple-500/10',   icon: 'text-purple-500',   divider: 'border-purple-500/15' },
  search: { border: 'border-blue-500/20',     bg: 'bg-blue-500/5',     hover: 'hover:bg-blue-500/10',     icon: 'text-blue-500',     divider: 'border-blue-500/15' },
  fetch:  { border: 'border-indigo-500/20',   bg: 'bg-indigo-500/5',   hover: 'hover:bg-indigo-500/10',   icon: 'text-indigo-500',   divider: 'border-indigo-500/15' },
  think:  { border: 'border-muted-foreground/15', bg: 'bg-muted/5',    hover: 'hover:bg-muted/10',        icon: 'text-muted-foreground', divider: 'border-muted-foreground/10' },
  todo:   { border: 'border-primary/20',      bg: 'bg-primary/5',      hover: 'hover:bg-primary/10',      icon: 'text-primary',      divider: 'border-primary/15' },
} as const;

type ToolColorKey = keyof typeof TOOL_COLORS;

/**
 * Shared collapsible card wrapper for all tool widgets.
 * Renders a colored card header with icon + title, expandable body.
 */
export const ToolCard: React.FC<{
  colorKey: ToolColorKey;
  icon: React.ReactNode;
  title: string;
  meta?: string;
  defaultExpanded?: boolean;
  statusIcon?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ colorKey, icon, title, meta, defaultExpanded = false, statusIcon, children }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const colors = TOOL_COLORS[colorKey];

  return (
    <div className={cn("my-1.5 rounded-lg border overflow-hidden", colors.border, colors.bg)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 transition-colors text-left",
          colors.hover
        )}
      >
        <span className={cn("shrink-0", colors.icon)}>{icon}</span>
        <span className="text-sm font-medium flex-1 truncate">{title}</span>
        {meta && <span className="text-[11px] text-muted-foreground shrink-0">{meta}</span>}
        {statusIcon && <span className="shrink-0">{statusIcon}</span>}
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/60 shrink-0 transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
      </button>
      {isExpanded && children && (
        <div className={cn("border-t px-3 py-2.5 bg-background/60", colors.divider)}>
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Widget for TodoWrite tool - displays a beautiful TODO list
 */
export const TodoWidget: React.FC<{ todos: any[]; result?: any }> = ({ todos, result: _result }) => {
  const statusIcons = {
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    in_progress: <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
    pending: <Circle className="h-4 w-4 text-muted-foreground" />
  };

  const priorityColors = {
    high: "bg-red-500/10 text-red-500 border-red-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-green-500/10 text-green-500 border-green-500/20"
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <FileEdit className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Todo List</span>
      </div>
      <div className="space-y-2">
        {todos.map((todo, idx) => (
          <div
            key={todo.id || idx}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border bg-card/50",
              todo.status === "completed" && "opacity-60"
            )}
          >
            <div className="mt-0.5">
              {statusIcons[todo.status as keyof typeof statusIcons] || statusIcons.pending}
            </div>
            <div className="flex-1 space-y-1">
              <p className={cn(
                "text-sm",
                todo.status === "completed" && "line-through"
              )}>
                {todo.content}
              </p>
              {todo.priority && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", priorityColors[todo.priority as keyof typeof priorityColors])}
                >
                  {todo.priority}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Widget for LS (List Directory) tool
 */
export const LSWidget: React.FC<{ path: string; result?: any }> = ({ path, result }) => {
  let resultContent = '';
  if (result) {
    if (typeof result.content === 'string') resultContent = result.content;
    else if (result.content && typeof result.content === 'object') {
      if (result.content.text) resultContent = result.content.text;
      else if (Array.isArray(result.content)) resultContent = result.content.map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c))).join('\n');
      else resultContent = JSON.stringify(result.content, null, 2);
    }
  }

  const itemCount = resultContent ? resultContent.split('\n').filter(l => l.trim()).length : 0;

  return (
    <ToolCard
      colorKey="ls"
      icon={<FolderOpen className="h-4 w-4" />}
      title={`List ${path}`}
      meta={result ? `${itemCount} items` : undefined}
      statusIcon={
        !result ? <div className="h-1.5 w-1.5 bg-cyan-500 rounded-full animate-pulse" /> :
        <CheckCircle2 className="h-3 w-3 text-green-500" />
      }
    >
      {resultContent && <LSResultWidget content={resultContent} />}
    </ToolCard>
  );
};

/**
 * Widget for LS tool result - displays directory tree structure
 */
export const LSResultWidget: React.FC<{ content: string }> = ({ content }) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  
  // Parse the directory tree structure
  const parseDirectoryTree = (rawContent: string) => {
    const lines = rawContent.split('\n');
    const entries: Array<{
      path: string;
      name: string;
      type: 'file' | 'directory';
      level: number;
    }> = [];
    
    let currentPath: string[] = [];
    
    for (const line of lines) {
      // Skip NOTE section and everything after it
      if (line.startsWith('NOTE:')) {
        break;
      }
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Calculate indentation level
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const level = Math.floor(indent.length / 2);
      
      // Extract the entry name
      const entryMatch = line.match(/^\s*-\s+(.+?)(\/$)?$/);
      if (!entryMatch) continue;
      
      const fullName = entryMatch[1];
      const isDirectory = line.trim().endsWith('/');
      const name = isDirectory ? fullName : fullName;
      
      // Update current path based on level
      currentPath = currentPath.slice(0, level);
      currentPath.push(name);
      
      entries.push({
        path: currentPath.join('/'),
        name,
        type: isDirectory ? 'directory' : 'file',
        level,
      });
    }
    
    return entries;
  };
  
  const entries = parseDirectoryTree(content);
  
  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };
  
  // Group entries by parent for collapsible display
  const getChildren = (parentPath: string, parentLevel: number) => {
    return entries.filter(e => {
      if (e.level !== parentLevel + 1) return false;
      const parentParts = parentPath.split('/').filter(Boolean);
      const entryParts = e.path.split('/').filter(Boolean);
      
      // Check if this entry is a direct child of the parent
      if (entryParts.length !== parentParts.length + 1) return false;
      
      // Check if all parent parts match
      for (let i = 0; i < parentParts.length; i++) {
        if (parentParts[i] !== entryParts[i]) return false;
      }
      
      return true;
    });
  };
  
  const renderEntry = (entry: typeof entries[0], isRoot = false) => {
    const hasChildren = entry.type === 'directory' && 
      entries.some(e => e.path.startsWith(entry.path + '/') && e.level === entry.level + 1);
    const isExpanded = expandedDirs.has(entry.path) || isRoot;
    
    const getIcon = () => {
      if (entry.type === 'directory') {
        return isExpanded ? 
          <FolderOpen className="h-3.5 w-3.5 text-blue-500" /> : 
          <Folder className="h-3.5 w-3.5 text-blue-500" />;
      }
      
      // File type icons based on extension
      const ext = entry.name.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'rs':
          return <FileCode className="h-3.5 w-3.5 text-orange-500" />;
        case 'toml':
        case 'yaml':
        case 'yml':
        case 'json':
          return <FileText className="h-3.5 w-3.5 text-yellow-500" />;
        case 'md':
          return <FileText className="h-3.5 w-3.5 text-blue-400" />;
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
          return <FileCode className="h-3.5 w-3.5 text-yellow-400" />;
        case 'py':
          return <FileCode className="h-3.5 w-3.5 text-blue-500" />;
        case 'go':
          return <FileCode className="h-3.5 w-3.5 text-cyan-500" />;
        case 'sh':
        case 'bash':
          return <Terminal className="h-3.5 w-3.5 text-green-500" />;
        default:
          return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
      }
    };
    
    return (
      <div key={entry.path}>
        <div 
          className={cn(
            "flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 transition-colors cursor-pointer",
            !isRoot && "ml-4"
          )}
          onClick={() => entry.type === 'directory' && hasChildren && toggleDirectory(entry.path)}
        >
          {entry.type === 'directory' && hasChildren && (
            <ChevronRight className={cn(
              "h-3 w-3 text-muted-foreground transition-transform",
              isExpanded && "rotate-90"
            )} />
          )}
          {(!hasChildren || entry.type !== 'directory') && (
            <div className="w-3" />
          )}
          {getIcon()}
          <span className="text-sm font-mono">{entry.name}</span>
        </div>
        
        {entry.type === 'directory' && hasChildren && isExpanded && (
          <div className="ml-2">
            {getChildren(entry.path, entry.level).map(child => renderEntry(child))}
          </div>
        )}
      </div>
    );
  };
  
  // Get root entries
  const rootEntries = entries.filter(e => e.level === 0);
  
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="space-y-1">
        {rootEntries.map(entry => renderEntry(entry, true))}
      </div>
    </div>
  );
};

/**
 * Widget for Read tool
 */
export const ReadWidget: React.FC<{ filePath: string; result?: any }> = ({ filePath, result }) => {
  let resultContent = '';
  if (result) {
    if (typeof result.content === 'string') {
      resultContent = result.content;
    } else if (result.content && typeof result.content === 'object') {
      if (result.content.text) resultContent = result.content.text;
      else if (Array.isArray(result.content)) resultContent = result.content.map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c))).join('\n');
      else resultContent = JSON.stringify(result.content, null, 2);
    }
  }

  const lineCount = resultContent ? resultContent.split('\n').filter(l => l.trim()).length : 0;
  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  return (
    <ToolCard
      colorKey="read"
      icon={<FileText className="h-4 w-4" />}
      title={`Read ${fileName}`}
      meta={result ? `${lineCount} lines` : undefined}
      statusIcon={
        !result ? <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" /> :
        <CheckCircle2 className="h-3 w-3 text-green-500" />
      }
    >
      {resultContent && <ReadResultWidget content={resultContent} filePath={filePath} />}
    </ToolCard>
  );
};

/**
 * Widget for Read tool result - shows file content with line numbers
 */
export const ReadResultWidget: React.FC<{ content: string; filePath?: string }> = ({ content, filePath }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);
  
  // Extract file extension for syntax highlighting
  const getLanguage = (path?: string) => {
    if (!path) return "text";
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: "typescript",
      tsx: "tsx",
      js: "javascript",
      jsx: "jsx",
      py: "python",
      rs: "rust",
      go: "go",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      php: "php",
      rb: "ruby",
      swift: "swift",
      kt: "kotlin",
      scala: "scala",
      sh: "bash",
      bash: "bash",
      zsh: "bash",
      yaml: "yaml",
      yml: "yaml",
      json: "json",
      xml: "xml",
      html: "html",
      css: "css",
      scss: "scss",
      sass: "sass",
      less: "less",
      sql: "sql",
      md: "markdown",
      toml: "ini",
      ini: "ini",
      dockerfile: "dockerfile",
      makefile: "makefile"
    };
    return languageMap[ext || ""] || "text";
  };

  // Parse content to separate line numbers from code
  const parseContent = (rawContent: string) => {
    const lines = rawContent.split('\n');
    const codeLines: string[] = [];
    let minLineNumber = Infinity;

    // First, determine if the content is likely a numbered list from the 'read' tool.
    // It is if more than half the non-empty lines match the expected format.
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    if (nonEmptyLines.length === 0) {
      return { codeContent: rawContent, startLineNumber: 1 };
    }
    const parsableLines = nonEmptyLines.filter(line => /^\s*\d+→/.test(line)).length;
    const isLikelyNumbered = (parsableLines / nonEmptyLines.length) > 0.5;

    if (!isLikelyNumbered) {
      return { codeContent: rawContent, startLineNumber: 1 };
    }
    
    // If it's a numbered list, parse it strictly.
    for (const line of lines) {
      // Remove leading whitespace before parsing
      const trimmedLine = line.trimStart();
      const match = trimmedLine.match(/^(\d+)→(.*)$/);
      if (match) {
        const lineNum = parseInt(match[1], 10);
        if (minLineNumber === Infinity) {
          minLineNumber = lineNum;
        }
        // Preserve the code content exactly as it appears after the arrow
        codeLines.push(match[2]);
      } else if (line.trim() === '') {
        // Preserve empty lines
        codeLines.push('');
      } else {
        // If a line in a numbered block does not match, it's a formatting anomaly.
        // Render it as a blank line to avoid showing the raw, un-parsed string.
        codeLines.push('');
      }
    }
    
    // Remove trailing empty lines
    while (codeLines.length > 0 && codeLines[codeLines.length - 1] === '') {
      codeLines.pop();
    }
    
    return {
      codeContent: codeLines.join('\n'),
      startLineNumber: minLineNumber === Infinity ? 1 : minLineNumber
    };
  };

  const language = getLanguage(filePath);
  const { codeContent, startLineNumber } = parseContent(content);
  const lineCount = content.split('\n').filter(line => line.trim()).length;
  const isLargeFile = lineCount > 20;

  return (
    <div className="rounded-md overflow-hidden bg-muted/20 w-full">
      {isLargeFile && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="font-mono">{filePath || "File content"} ({lineCount} lines)</span>
          <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
        </button>
      )}

      {(!isLargeFile || isExpanded) && (
        <div className="relative overflow-x-auto max-h-[400px] overflow-y-auto">
          <SyntaxHighlighter
            language={language}
            style={syntaxTheme}
            showLineNumbers
            startingLineNumber={startLineNumber}
            wrapLongLines={false}
            customStyle={{
              margin: 0,
              background: 'transparent',
              lineHeight: '1.6'
            }}
            codeTagProps={{
              style: { fontSize: '0.75rem' }
            }}
            lineNumberStyle={{
              minWidth: "3.5rem",
              paddingRight: "1rem",
              textAlign: "right",
              opacity: 0.5,
            }}
          >
            {codeContent}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
};

/**
 * Widget for Glob tool
 */
export const GlobWidget: React.FC<{ pattern: string; result?: any }> = ({ pattern, result }) => {
  let resultContent = '';
  let isError = false;

  if (result) {
    isError = result.is_error || false;
    if (typeof result.content === 'string') resultContent = result.content;
    else if (result.content && typeof result.content === 'object') {
      if (result.content.text) resultContent = result.content.text;
      else if (Array.isArray(result.content)) resultContent = result.content.map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c))).join('\n');
      else resultContent = JSON.stringify(result.content, null, 2);
    }
  }

  const fileCount = resultContent ? resultContent.split('\n').filter(l => l.trim()).length : 0;

  return (
    <ToolCard
      colorKey="glob"
      icon={<FolderSearch className="h-4 w-4" />}
      title={`Glob ${pattern}`}
      meta={result ? `${fileCount} files` : undefined}
      statusIcon={
        !result ? <div className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse" /> : undefined
      }
    >
      {resultContent && (
        <pre className={cn(
          "text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto",
          isError ? "text-red-400" : "text-muted-foreground"
        )}>
          {resultContent}
        </pre>
      )}
    </ToolCard>
  );
};

/**
 * Widget for Bash tool
 */
export const BashWidget: React.FC<{
  command: string;
  description?: string;
  result?: any;
}> = ({ command, description, result }) => {
  let resultContent = '';
  let isError = false;

  if (result) {
    isError = result.is_error || false;
    if (typeof result.content === 'string') {
      resultContent = result.content;
    } else if (result.content && typeof result.content === 'object') {
      if (result.content.text) {
        resultContent = result.content.text;
      } else if (Array.isArray(result.content)) {
        resultContent = result.content
          .map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c)))
          .join('\n');
      } else {
        resultContent = JSON.stringify(result.content, null, 2);
      }
    }
  }

  const displayCmd = description || (command.length > 60 ? command.slice(0, 60) + '...' : command);

  return (
    <ToolCard
      colorKey="bash"
      icon={<Terminal className="h-4 w-4" />}
      title={`$ ${displayCmd}`}
      statusIcon={
        !result ? <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" /> :
        isError ? <AlertCircle className="h-3 w-3 text-red-500" /> :
        <CheckCircle2 className="h-3 w-3 text-green-500" />
      }
    >
      <div>
        <code className="text-xs font-mono text-green-400 block">$ {command}</code>
        {resultContent && (
          <pre className={cn(
            "mt-2 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-[300px] overflow-y-auto",
            isError ? "text-red-400" : "text-muted-foreground"
          )}>
            {resultContent}
          </pre>
        )}
      </div>
    </ToolCard>
  );
};

/**
 * Widget for Write tool
 */
export const WriteWidget: React.FC<{ filePath: string; content: string; result?: any }> = ({ filePath, content, result: _result }) => {
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);
  const language = getLanguage(filePath);
  const lineCount = content.split('\n').length;
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  const isLargeContent = content.length > 1000;
  const displayContent = isLargeContent ? content.substring(0, 1000) + "\n..." : content;

  return (
    <ToolCard
      colorKey="write"
      icon={<FilePlus className="h-4 w-4" />}
      title={`Write ${fileName}`}
      meta={`+${lineCount} lines`}
      statusIcon={<span className="text-green-500 text-[11px] font-medium">+{lineCount}</span>}
    >
      <div className="overflow-auto max-h-[300px]">
        <SyntaxHighlighter
          language={language}
          style={syntaxTheme}
          customStyle={{ margin: 0, padding: '0.75rem', background: 'transparent', fontSize: '0.75rem', lineHeight: '1.5' }}
          wrapLongLines={false}
          showLineNumbers
        >
          {displayContent}
        </SyntaxHighlighter>
      </div>
    </ToolCard>
  );
};

/**
 * Widget for Grep tool
 */
export const GrepWidget: React.FC<{
  pattern: string;
  include?: string;
  path?: string;
  exclude?: string;
  result?: any;
}> = ({ pattern, include, path, exclude, result }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  let resultContent = '';
  let isError = false;

  if (result) {
    isError = result.is_error || false;
    if (typeof result.content === 'string') resultContent = result.content;
    else if (result.content && typeof result.content === 'object') {
      if (result.content.text) resultContent = result.content.text;
      else if (Array.isArray(result.content)) resultContent = result.content.map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c))).join('\n');
      else resultContent = JSON.stringify(result.content, null, 2);
    }
  }

  const matchCount = resultContent ? resultContent.split('\n').filter(l => l.trim()).length : 0;
  const label = [pattern, include && `in ${include}`, path && `@ ${path}`].filter(Boolean).join(' ');

  return (
    <ToolCard
      colorKey="grep"
      icon={<Search className="h-4 w-4" />}
      title={`Grep '${pattern}'`}
      meta={result && !isError ? `${matchCount} matches` : undefined}
      statusIcon={
        !result ? <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" /> :
        isError ? <AlertCircle className="h-3 w-3 text-red-500" /> : undefined
      }
    >
      {resultContent && (
        <pre className={cn(
          "text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto",
          isError ? "text-red-400" : "text-muted-foreground"
        )}>
          {resultContent}
        </pre>
      )}
    </ToolCard>
  );
};

const getLanguage = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    yaml: "yaml",
    yml: "yaml",
    json: "json",
    xml: "xml",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    sql: "sql",
    md: "markdown",
    toml: "ini",
    ini: "ini",
    dockerfile: "dockerfile",
    makefile: "makefile"
  };
  return languageMap[ext || ""] || "text";
};

/**
 * Widget for Edit tool - shows the edit operation
 */
export const EditWidget: React.FC<{
  file_path: string;
  old_string: string;
  new_string: string;
  result?: any;
}> = ({ file_path, old_string, new_string, result: _result }) => {
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);

  const diffResult = Diff.diffLines(old_string || '', new_string || '', {
    newlineIsToken: true,
    ignoreWhitespace: false
  });
  const language = getLanguage(file_path);
  const addedLines = diffResult.filter(p => p.added).reduce((acc, p) => acc + (p.count || 0), 0);
  const removedLines = diffResult.filter(p => p.removed).reduce((acc, p) => acc + (p.count || 0), 0);

  const fileName = file_path.split(/[/\\]/).pop() || file_path;

  return (
    <ToolCard
      colorKey="edit"
      icon={<FileEdit className="h-4 w-4" />}
      title={`Edit ${fileName}`}
      meta={`+${addedLines} -${removedLines}`}
    >
      <div className="rounded-md bg-muted/20 overflow-hidden text-xs font-mono">
        <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
          {diffResult.map((part, index) => {
            const partClass = part.added ? 'bg-green-950/20' : part.removed ? 'bg-red-950/20' : '';
            if (!part.added && !part.removed && part.count && part.count > 8) {
              return (
                <div key={index} className="px-3 py-0.5 text-center text-muted-foreground text-xs">
                  ... {part.count} unchanged lines ...
                </div>
              );
            }
            const value = part.value.endsWith('\n') ? part.value.slice(0, -1) : part.value;
            return (
              <div key={index} className={cn(partClass, "flex")}>
                <div className="w-6 select-none text-center flex-shrink-0">
                  {part.added ? <span className="text-green-400">+</span> : part.removed ? <span className="text-red-400">-</span> : null}
                </div>
                <div className="flex-1">
                  <SyntaxHighlighter language={language} style={syntaxTheme} PreTag="div" wrapLongLines={false}
                    customStyle={{ margin: 0, padding: 0, background: 'transparent' }}
                    codeTagProps={{ style: { fontSize: '0.75rem', lineHeight: '1.5' } }}
                  >
                    {value}
                  </SyntaxHighlighter>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ToolCard>
  );
};

/**
 * Widget for Edit tool result - shows a diff view
 */
export const EditResultWidget: React.FC<{ content: string }> = ({ content }) => {
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);
  
  // Parse the content to extract file path and code snippet
  const lines = content.split('\n');
  let filePath = '';
  const codeLines: { lineNumber: string; code: string }[] = [];
  let inCodeBlock = false;
  
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (line.includes('The file') && line.includes('has been updated')) {
      const match = line.match(/The file (.+) has been updated/);
      if (match) {
        filePath = match[1];
      }
    } else if (/^\s*\d+/.test(line)) {
      inCodeBlock = true;
      const lineMatch = line.match(/^\s*(\d+)\t?(.*)$/);
      if (lineMatch) {
        const [, lineNum, codePart] = lineMatch;
        codeLines.push({
          lineNumber: lineNum,
          code: codePart,
        });
      }
    } else if (inCodeBlock) {
      // Allow non-numbered lines inside a code block (for empty lines)
      codeLines.push({ lineNumber: '', code: line });
    }
  }

  const codeContent = codeLines.map(l => l.code).join('\n');
  const firstNumberedLine = codeLines.find(l => l.lineNumber !== '');
  const startLineNumber = firstNumberedLine ? parseInt(firstNumberedLine.lineNumber) : 1;
  const language = getLanguage(filePath);

  return (
    <div className="rounded-md bg-muted/20 overflow-hidden">
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <SyntaxHighlighter
          language={language}
          style={syntaxTheme}
          showLineNumbers
          startingLineNumber={startLineNumber}
          wrapLongLines={false}
          customStyle={{ margin: 0, background: 'transparent', lineHeight: '1.5' }}
          codeTagProps={{ style: { fontSize: '0.75rem' } }}
          lineNumberStyle={{ minWidth: "3rem", paddingRight: "0.75rem", textAlign: "right", opacity: 0.5 }}
        >
          {codeContent}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

/**
 * Widget for MCP (Model Context Protocol) tools
 */
export const MCPWidget: React.FC<{ 
  toolName: string; 
  input?: any;
  result?: any;
}> = ({ toolName, input, result: _result }) => {
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);
  
  // Parse the tool name to extract components
  // Format: mcp__namespace__method
  const parts = toolName.split('__');
  const namespace = parts[1] || '';
  const method = parts[2] || '';
  
  // Format namespace for display (handle kebab-case and snake_case)
  const formatNamespace = (ns: string) => {
    return ns
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Format method name
  const formatMethod = (m: string) => {
    return m
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const hasInput = input && Object.keys(input).length > 0;
  const inputString = hasInput ? JSON.stringify(input, null, 2) : '';
  const isLargeInput = inputString.length > 200;
  
  // Count tokens approximation (very rough estimate)
  const estimateTokens = (str: string) => {
    // Rough approximation: ~4 characters per token
    return Math.ceil(str.length / 4);
  };
  
  const inputTokens = hasInput ? estimateTokens(inputString) : 0;

  return (
    <ToolCard
      colorKey="mcp"
      icon={<Package2 className="h-4 w-4" />}
      title={`${formatNamespace(namespace)}.${formatMethod(method)}()`}
      meta={hasInput ? `~${inputTokens} tokens` : undefined}
    >
      {hasInput && (
        <div className="rounded-md bg-muted/30 overflow-hidden max-h-[300px] overflow-y-auto">
          <SyntaxHighlighter
            language="json"
            style={syntaxTheme}
            customStyle={{ margin: 0, padding: '0.75rem', background: 'transparent', fontSize: '0.75rem', lineHeight: '1.5' }}
            wrapLongLines={false}
          >
            {inputString}
          </SyntaxHighlighter>
        </div>
      )}
    </ToolCard>
  );
};

/**
 * Widget for user commands (e.g., model, clear)
 */
export const CommandWidget: React.FC<{
  commandName: string;
  commandMessage: string;
  commandArgs?: string;
}> = ({ commandName, commandMessage, commandArgs }) => {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground py-1">
      <Terminal className="h-3 w-3 text-blue-500" />
      <code className="font-mono text-foreground">{commandName}</code>
      {commandArgs && <code className="font-mono">{commandArgs}</code>}
      {commandMessage && commandMessage !== commandName && (
        <span className="text-muted-foreground">{commandMessage}</span>
      )}
    </div>
  );
};

/**
 * Widget for command output/stdout
 */
export const CommandOutputWidget: React.FC<{ 
  output: string;
  onLinkDetected?: (url: string) => void;
}> = ({ output, onLinkDetected }) => {
  // Check for links on mount and when output changes
  React.useEffect(() => {
    if (output && onLinkDetected) {
      const links = detectLinks(output);
      if (links.length > 0) {
        // Notify about the first detected link
        onLinkDetected(links[0].fullUrl);
      }
    }
  }, [output, onLinkDetected]);

  // Parse ANSI codes for basic styling
  const parseAnsiToReact = (text: string) => {
    // Simple ANSI parsing - handles bold (\u001b[1m) and reset (\u001b[22m)
    const parts = text.split(/(\u001b\[\d+m)/);
    let isBold = false;
    const elements: React.ReactNode[] = [];
    
    parts.forEach((part, idx) => {
      if (part === '\u001b[1m') {
        isBold = true;
        return;
      } else if (part === '\u001b[22m') {
        isBold = false;
        return;
      } else if (part.match(/\u001b\[\d+m/)) {
        // Ignore other ANSI codes for now
        return;
      }
      
      if (!part) return;
      
      // Make links clickable within this part
      const linkElements = makeLinksClickable(part, (url) => {
        onLinkDetected?.(url);
      });
      
      if (isBold) {
        elements.push(
          <span key={idx} className="font-bold">
            {linkElements}
        </span>
      );
      } else {
        elements.push(...linkElements);
      }
    });
    
    return elements;
  };

  return (
    <div className="rounded-md bg-muted/30 p-3 my-1">
      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
        {output ? parseAnsiToReact(output) : <span className="italic">No output</span>}
      </pre>
    </div>
  );
};

/**
 * Widget for AI-generated summaries
 */
export const SummaryWidget: React.FC<{
  summary: string;
  leafUuid?: string;
}> = ({ summary }) => {
  return (
    <div className="my-1 px-3 py-2 rounded-md bg-muted/10 border border-muted/20">
      <p className="text-sm text-foreground">{summary}</p>
    </div>
  );
};

/**
 * Widget for displaying MultiEdit tool usage
 */
export const MultiEditWidget: React.FC<{
  file_path: string;
  edits: Array<{ old_string: string; new_string: string }>;
  result?: any;
}> = ({ file_path, edits, result: _result }) => {
  const language = getLanguage(file_path);
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);
  
  const totalAdded = edits.reduce((acc, e) => acc + Diff.diffLines(e.old_string || '', e.new_string || '').filter(p => p.added).reduce((a, p) => a + (p.count || 0), 0), 0);
  const totalRemoved = edits.reduce((acc, e) => acc + Diff.diffLines(e.old_string || '', e.new_string || '').filter(p => p.removed).reduce((a, p) => a + (p.count || 0), 0), 0);

  const fileName = file_path.split(/[/\\]/).pop() || file_path;

  return (
    <ToolCard
      colorKey="edit"
      icon={<FileEdit className="h-4 w-4" />}
      title={`Edit ${fileName} (${edits.length} edits)`}
      meta={`+${totalAdded} -${totalRemoved}`}
    >
      <div className="space-y-2">
        {edits.map((edit, index) => {
          const diffResult = Diff.diffLines(edit.old_string || '', edit.new_string || '', {
            newlineIsToken: true,
            ignoreWhitespace: false
          });

          return (
            <div key={index} className="rounded-md bg-muted/20 overflow-hidden text-xs font-mono">
              <div className="max-h-[200px] overflow-y-auto overflow-x-auto">
                {diffResult.map((part, partIndex) => {
                  const partClass = part.added ? 'bg-green-950/20' : part.removed ? 'bg-red-950/20' : '';
                  if (!part.added && !part.removed && part.count && part.count > 8) {
                    return (<div key={partIndex} className="px-3 py-0.5 text-center text-muted-foreground text-xs">... {part.count} unchanged lines ...</div>);
                  }
                  const value = part.value.endsWith('\n') ? part.value.slice(0, -1) : part.value;
                  return (
                    <div key={partIndex} className={cn(partClass, "flex")}>
                      <div className="w-6 select-none text-center flex-shrink-0">
                        {part.added ? <span className="text-green-400">+</span> : part.removed ? <span className="text-red-400">-</span> : null}
                      </div>
                      <div className="flex-1">
                        <SyntaxHighlighter language={language} style={syntaxTheme} PreTag="div" wrapLongLines={false}
                          customStyle={{ margin: 0, padding: 0, background: 'transparent' }}
                          codeTagProps={{ style: { fontSize: '0.75rem', lineHeight: '1.5' } }}
                        >
                          {value}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ToolCard>
  );
};

/**
 * Widget for displaying MultiEdit tool results with diffs
 */
export const MultiEditResultWidget: React.FC<{ 
  content: string;
  edits?: Array<{ old_string: string; new_string: string }>;
}> = ({ content, edits }) => {
  // If we have the edits array, show a nice diff view
  if (edits && edits.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-t-md border-b border-green-500/20">
          <GitBranch className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            {edits.length} Changes Applied
          </span>
        </div>
        
        <div className="space-y-4">
          {edits.map((edit, index) => {
            // Split the strings into lines for diff display
            const oldLines = edit.old_string.split('\n');
            const newLines = edit.new_string.split('\n');
            
            return (
              <div key={index} className="border border-border/50 rounded-md overflow-hidden">
                <div className="px-3 py-1 bg-muted/50 border-b border-border/50">
                  <span className="text-xs font-medium text-muted-foreground">Change {index + 1}</span>
                </div>
                
                <div className="font-mono text-xs">
                  {/* Show removed lines */}
                  {oldLines.map((line, lineIndex) => (
                    <div
                      key={`old-${lineIndex}`}
                      className="flex bg-red-500/10 border-l-4 border-red-500"
                    >
                      <span className="w-12 px-2 py-1 text-red-600 dark:text-red-400 select-none text-right bg-red-500/10">
                        -{lineIndex + 1}
                      </span>
                      <pre className="flex-1 px-3 py-1 text-red-700 dark:text-red-300 overflow-x-auto">
                        <code>{line || ' '}</code>
                      </pre>
                    </div>
                  ))}
                  
                  {/* Show added lines */}
                  {newLines.map((line, lineIndex) => (
                    <div
                      key={`new-${lineIndex}`}
                      className="flex bg-green-500/10 border-l-4 border-green-500"
                    >
                      <span className="w-12 px-2 py-1 text-green-600 dark:text-green-400 select-none text-right bg-green-500/10">
                        +{lineIndex + 1}
                      </span>
                      <pre className="flex-1 px-3 py-1 text-green-700 dark:text-green-300 overflow-x-auto">
                        <code>{line || ' '}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Fallback to simple content display
  return (
    <div className="p-3 bg-muted/50 rounded-md border">
      <pre className="text-xs font-mono whitespace-pre-wrap">{content}</pre>
    </div>
  );
};

/**
 * Widget for displaying system reminders (instead of raw XML)
 */
export const SystemReminderWidget: React.FC<{ message: string }> = ({ message }) => {
  // Extract icon based on message content
  let icon = <Info className="h-4 w-4" />;
  let colorClass = "border-blue-500/20 bg-blue-500/5 text-blue-600";
  
  if (message.toLowerCase().includes("warning")) {
    icon = <AlertCircle className="h-4 w-4" />;
    colorClass = "border-yellow-500/20 bg-yellow-500/5 text-yellow-600";
  } else if (message.toLowerCase().includes("error")) {
    icon = <AlertCircle className="h-4 w-4" />;
    colorClass = "border-destructive/20 bg-destructive/5 text-destructive";
  }
  
  return (
    <div className={cn("flex items-start gap-2 p-3 rounded-md border", colorClass)}>
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 text-sm">{message}</div>
    </div>
  );
};

/**
 * Widget for displaying system initialization information in a visually appealing way
 * Separates regular tools from MCP tools and provides icons for each tool type
 */
export const SystemInitializedWidget: React.FC<{
  sessionId?: string;
  model?: string;
  cwd?: string;
  tools?: string[];
}> = ({ sessionId, model, cwd, tools = [] }) => {
  const [mcpExpanded, setMcpExpanded] = useState(false);
  
  // Separate regular tools from MCP tools
  const regularTools = tools.filter(tool => !tool.startsWith('mcp__'));
  const mcpTools = tools.filter(tool => tool.startsWith('mcp__'));
  
  // Tool icon mapping for regular tools
  const toolIcons: Record<string, LucideIcon> = {
    'task': CheckSquare,
    'bash': Terminal,
    'glob': FolderSearch,
    'grep': Search,
    'ls': List,
    'exit_plan_mode': LogOut,
    'read': FileText,
    'edit': Edit3,
    'multiedit': Edit3,
    'write': FilePlus,
    'notebookread': Book,
    'notebookedit': BookOpen,
    'webfetch': Globe,
    'todoread': ListChecks,
    'todowrite': ListPlus,
    'websearch': Globe2,
  };
  
  // Get icon for a tool, fallback to Wrench
  const getToolIcon = (toolName: string) => {
    const normalizedName = toolName.toLowerCase();
    return toolIcons[normalizedName] || Wrench;
  };
  
  // Format MCP tool name (remove mcp__ prefix and format underscores)
  const formatMcpToolName = (toolName: string) => {
    // Remove mcp__ prefix
    const withoutPrefix = toolName.replace(/^mcp__/, '');
    // Split by double underscores first (provider separator)
    const parts = withoutPrefix.split('__');
    if (parts.length >= 2) {
      // Format provider name and method name separately
      const provider = parts[0].replace(/_/g, ' ').replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      const method = parts.slice(1).join('__').replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { provider, method };
    }
    // Fallback formatting
    return {
      provider: 'MCP',
      method: withoutPrefix.replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    };
  };
  
  // Group MCP tools by provider
  const mcpToolsByProvider = mcpTools.reduce((acc, tool) => {
    const { provider } = formatMcpToolName(tool);
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(tool);
    return acc;
  }, {} as Record<string, string[]>);
  
  return (
    <div className="my-1 text-xs text-muted-foreground flex items-center gap-1.5 py-1">
      <Settings className="h-3 w-3" />
      <span>Session initialized</span>
      {model && <span className="font-mono">({model})</span>}
      {regularTools.length > 0 && <span>{regularTools.length} tools</span>}
      {mcpTools.length > 0 && <span>+ {mcpTools.length} MCP</span>}
    </div>
  );
};

/**
 * Widget for Task tool - displays sub-agent task information
 */
export const TaskWidget: React.FC<{
  description?: string;
  prompt?: string;
  result?: any;
}> = ({ description, prompt, result: _result }) => {
  return (
    <ToolCard
      colorKey="task"
      icon={<Zap className="h-4 w-4" />}
      title={`Agent: ${description || 'Task'}`}
    >
      {prompt && (
        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
          {prompt}
        </pre>
      )}
    </ToolCard>
  );
};

/**
 * Widget for WebSearch tool - displays web search query and results
 */
export const WebSearchWidget: React.FC<{
  query: string;
  result?: any;
  onOpenInBrowser?: (url: string) => void;
}> = ({ query, result, onOpenInBrowser }) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  
  // Parse the result to extract all links sections and build a structured representation
  const parseSearchResult = (resultContent: string) => {
    const sections: Array<{
      type: 'text' | 'links';
      content: string | Array<{ title: string; url: string }>;
    }> = [];
    
    // Split by "Links: [" to find all link sections
    const parts = resultContent.split(/Links:\s*\[/);
    
    // First part is always text (or empty)
    if (parts[0]) {
      sections.push({ type: 'text', content: parts[0].trim() });
    }
    
    // Process each links section
    parts.slice(1).forEach(part => {
      try {
        // Find the closing bracket
        const closingIndex = part.indexOf(']');
        if (closingIndex === -1) return;
        
        const linksJson = '[' + part.substring(0, closingIndex + 1);
        const remainingText = part.substring(closingIndex + 1).trim();
        
        // Parse the JSON array
        const links = JSON.parse(linksJson);
        sections.push({ type: 'links', content: links });
        
        // Add any remaining text
        if (remainingText) {
          sections.push({ type: 'text', content: remainingText });
        }
      } catch (e) {
        // If parsing fails, treat it as text
        sections.push({ type: 'text', content: 'Links: [' + part });
      }
    });
    
    return sections;
  };
  
  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };
  
  // Extract result content if available
  let searchResults: {
    sections: Array<{
      type: 'text' | 'links';
      content: string | Array<{ title: string; url: string }>;
    }>;
    noResults: boolean;
  } = { sections: [], noResults: false };
  
  if (result) {
    let resultContent = '';
    if (typeof result.content === 'string') {
      resultContent = result.content;
    } else if (result.content && typeof result.content === 'object') {
      if (result.content.text) {
        resultContent = result.content.text;
      } else if (Array.isArray(result.content)) {
        resultContent = result.content
          .map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c)))
          .join('\n');
      } else {
        resultContent = JSON.stringify(result.content, null, 2);
      }
    }
    
    searchResults.noResults = resultContent.toLowerCase().includes('no links found') || 
                               resultContent.toLowerCase().includes('no results');
    searchResults.sections = parseSearchResult(resultContent);
  }
  
  const handleLinkClick = async (url: string) => {
    if (onOpenInBrowser) {
      onOpenInBrowser(url);
    } else {
      try {
        await open(url);
      } catch (error) {
        console.error('Failed to open URL:', error);
      }
    }
  };
  
  const resultCount = searchResults.sections.filter(s => s.type === 'links').reduce((acc, s) => acc + (Array.isArray(s.content) ? s.content.length : 0), 0);

  return (
    <ToolCard
      colorKey="search"
      icon={<Globe className="h-4 w-4" />}
      title={`Search: '${query}'`}
      meta={result && resultCount > 0 ? `${resultCount} results` : undefined}
      defaultExpanded={true}
      statusIcon={
        !result ? <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" /> : undefined
      }
    >
      {result && (
        <div>
          {!searchResults.sections.length ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-pulse flex items-center gap-1">
                <div className="h-1 w-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-1 w-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-1 w-1 bg-blue-500 rounded-full animate-bounce"></div>
              </div>
              <span className="text-sm">Searching...</span>
            </div>
          ) : searchResults.noResults ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No results found</span>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.sections.map((section, idx) => {
                if (section.type === 'text') {
                  return (
                    <div key={idx} className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{section.content as string}</ReactMarkdown>
                    </div>
                  );
                } else if (section.type === 'links' && Array.isArray(section.content)) {
                  const links = section.content;
                  const isSectionExpanded = expandedSections.has(idx);

                  return (
                    <div key={idx} className="space-y-1.5">
                      <button
                        onClick={() => toggleSection(idx)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isSectionExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <span>{links.length} result{links.length !== 1 ? 's' : ''}</span>
                      </button>

                      {isSectionExpanded ? (
                        <div className="grid gap-1.5 ml-4">
                          {links.map((link, linkIdx) => (
                            <button
                              key={linkIdx}
                              onClick={() => handleLinkClick(link.url)}
                              className="group flex flex-col gap-0.5 p-2.5 rounded-md border bg-card/30 hover:bg-card/50 hover:border-blue-500/30 transition-all text-left"
                            >
                              <div className="flex items-start gap-2">
                                <Globe2 className="h-3.5 w-3.5 text-blue-500/70 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium group-hover:text-blue-500 transition-colors line-clamp-2">{link.title}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{link.url}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 ml-4">
                          {links.map((link, linkIdx) => (
                            <button
                              key={linkIdx}
                              onClick={(e) => { e.stopPropagation(); handleLinkClick(link.url); }}
                              className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 hover:border-blue-500/20 transition-all"
                            >
                              <Globe2 className="h-3 w-3 text-blue-500/70" />
                              <span className="truncate max-w-[180px] text-foreground/70 group-hover:text-foreground/90">{link.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      )}
    </ToolCard>
  );
};

/**
 * Widget for displaying AI thinking/reasoning content
 * Collapsible and closed by default
 */
export const ThinkingWidget: React.FC<{
  thinking: string;
  signature?: string;
}> = ({ thinking }) => {
  const trimmedThinking = thinking.trim();

  return (
    <ToolCard
      colorKey="think"
      icon={<Sparkles className="h-4 w-4" />}
      title="Thinking..."
    >
      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap italic max-h-[300px] overflow-y-auto">
        {trimmedThinking}
      </pre>
    </ToolCard>
  );
};

/**
 * Widget for WebFetch tool - displays URL fetching with optional prompts
 */
export const WebFetchWidget: React.FC<{
  url: string;
  prompt?: string;
  result?: any;
  onOpenInBrowser?: (url: string) => void;
}> = ({ url, prompt, result, onOpenInBrowser }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  
  // Extract result content if available
  let fetchedContent = '';
  let isLoading = !result;
  let hasError = false;
  
  if (result) {
    if (typeof result.content === 'string') {
      fetchedContent = result.content;
    } else if (result.content && typeof result.content === 'object') {
      if (result.content.text) {
        fetchedContent = result.content.text;
      } else if (Array.isArray(result.content)) {
        fetchedContent = result.content
          .map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c)))
          .join('\n');
      } else {
        fetchedContent = JSON.stringify(result.content, null, 2);
      }
    }
    
    // Check if there's an error
    hasError = result.is_error || 
               fetchedContent.toLowerCase().includes('error') ||
               fetchedContent.toLowerCase().includes('failed');
  }
  
  // Truncate content for preview
  const maxPreviewLength = 500;
  const isTruncated = fetchedContent.length > maxPreviewLength;
  const previewContent = isTruncated && !showFullContent
    ? fetchedContent.substring(0, maxPreviewLength) + '...'
    : fetchedContent;
  
  // Extract domain from URL for display
  const getDomain = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname;
    } catch {
      return urlString;
    }
  };
  
  const handleUrlClick = async () => {
    if (onOpenInBrowser) {
      onOpenInBrowser(url);
    } else {
      try {
        await open(url);
      } catch (error) {
        console.error('Failed to open URL:', error);
      }
    }
  };
  
  return (
    <ToolCard
      colorKey="fetch"
      icon={<Globe className="h-4 w-4" />}
      title={`Fetch: ${getDomain(url)}`}
      defaultExpanded={true}
      statusIcon={
        isLoading ? <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-pulse" /> :
        hasError ? <AlertCircle className="h-3 w-3 text-red-500" /> :
        <CheckCircle2 className="h-3 w-3 text-green-500" />
      }
    >
      <div className="space-y-2">
        {/* URL */}
        <button
          onClick={handleUrlClick}
          className="text-xs text-indigo-500 hover:text-indigo-600 hover:underline truncate block max-w-full text-left"
        >
          {url}
        </button>

        {/* Prompt */}
        {prompt && (
          <div className="space-y-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
              <Info className="h-3 w-3" />
              <span>Analysis Prompt</span>
            </button>
            {isExpanded && (
              <div className="rounded-md border bg-muted/30 p-2 ml-4">
                <p className="text-xs text-foreground/90">{prompt}</p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-pulse flex items-center gap-1">
              <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce"></div>
            </div>
            <span className="text-xs">Fetching...</span>
          </div>
        ) : hasError ? (
          <div>
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="font-medium">Failed to fetch content</span>
            </div>
            <pre className="mt-1 text-xs font-mono text-muted-foreground whitespace-pre-wrap">{fetchedContent}</pre>
          </div>
        ) : fetchedContent ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Content from {getDomain(url)}</span>
              {isTruncated && (
                <button
                  onClick={() => setShowFullContent(!showFullContent)}
                  className="text-xs text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
                >
                  {showFullContent ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />More</>}
                </button>
              )}
            </div>
            <div className="relative">
              <div className={cn("rounded-md bg-muted/30 p-2 overflow-hidden", !showFullContent && isTruncated && "max-h-[300px]")}>
                <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap">{previewContent}</pre>
                {!showFullContent && isTruncated && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted/30 to-transparent pointer-events-none" />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Info className="h-3.5 w-3.5" />
            <span>No content returned</span>
          </div>
        )}
      </div>
    </ToolCard>
  );
};

/**
 * Widget for TodoRead tool - displays todos with advanced viewing capabilities
 */
export const TodoReadWidget: React.FC<{ todos?: any[]; result?: any }> = ({ todos: inputTodos, result }) => {
  // Extract todos from result if not directly provided
  let todos: any[] = inputTodos || [];
  if (!todos.length && result) {
    if (typeof result === 'object' && Array.isArray(result.todos)) {
      todos = result.todos;
    } else if (typeof result.content === 'string') {
      try {
        const parsed = JSON.parse(result.content);
        if (Array.isArray(parsed)) todos = parsed;
        else if (parsed.todos) todos = parsed.todos;
      } catch (e) {
        // Not JSON, ignore
      }
    }
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "board" | "timeline" | "stats">("list");
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());

  // Status icons and colors
  const statusConfig = {
    completed: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      label: "Completed"
    },
    in_progress: {
      icon: <Clock className="h-4 w-4 animate-pulse" />,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      label: "In Progress"
    },
    pending: {
      icon: <Circle className="h-4 w-4" />,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      borderColor: "border-muted",
      label: "Pending"
    },
    cancelled: {
      icon: <X className="h-4 w-4" />,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      label: "Cancelled"
    }
  };

  // Filter todos based on search and status
  const filteredTodos = todos.filter(todo => {
    const matchesSearch = !searchQuery || 
      todo.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (todo.id && todo.id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || todo.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.status === "completed").length,
    inProgress: todos.filter(t => t.status === "in_progress").length,
    pending: todos.filter(t => t.status === "pending").length,
    cancelled: todos.filter(t => t.status === "cancelled").length,
    completionRate: todos.length > 0 
      ? Math.round((todos.filter(t => t.status === "completed").length / todos.length) * 100)
      : 0
  };

  // Group todos by status for board view
  const todosByStatus = {
    pending: filteredTodos.filter(t => t.status === "pending"),
    in_progress: filteredTodos.filter(t => t.status === "in_progress"),
    completed: filteredTodos.filter(t => t.status === "completed"),
    cancelled: filteredTodos.filter(t => t.status === "cancelled")
  };

  // Toggle expanded state for a todo
  const toggleExpanded = (todoId: string) => {
    setExpandedTodos(prev => {
      const next = new Set(prev);
      if (next.has(todoId)) {
        next.delete(todoId);
      } else {
        next.add(todoId);
      }
      return next;
    });
  };

  // Export todos as JSON
  const exportAsJson = () => {
    const dataStr = JSON.stringify(todos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'todos.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Export todos as Markdown
  const exportAsMarkdown = () => {
    let markdown = "# Todo List\n\n";
    markdown += `**Total**: ${stats.total} | **Completed**: ${stats.completed} | **In Progress**: ${stats.inProgress} | **Pending**: ${stats.pending}\n\n`;
    
    const statusGroups = ["pending", "in_progress", "completed", "cancelled"];
    statusGroups.forEach(status => {
      const todosInStatus = todos.filter(t => t.status === status);
      if (todosInStatus.length > 0) {
        markdown += `## ${statusConfig[status as keyof typeof statusConfig]?.label || status}\n\n`;
        todosInStatus.forEach(todo => {
          const checkbox = todo.status === "completed" ? "[x]" : "[ ]";
          markdown += `- ${checkbox} ${todo.content}${todo.id ? ` (${todo.id})` : ""}\n`;
          if (todo.dependencies?.length > 0) {
            markdown += `  - Dependencies: ${todo.dependencies.join(", ")}\n`;
          }
        });
        markdown += "\n";
      }
    });
    
    const dataUri = 'data:text/markdown;charset=utf-8,'+ encodeURIComponent(markdown);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'todos.md');
    linkElement.click();
  };

  // Render todo card
  const TodoCard = ({ todo, isExpanded }: { todo: any; isExpanded: boolean }) => {
    const config = statusConfig[todo.status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "group rounded-lg border p-4 transition-all hover:shadow-md cursor-pointer",
          config.bgColor,
          config.borderColor,
          todo.status === "completed" && "opacity-75"
        )}
        onClick={() => todo.id && toggleExpanded(todo.id)}
      >
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5", config.color)}>
            {config.icon}
          </div>
          <div className="flex-1 space-y-2">
            <p className={cn(
              "text-sm",
              todo.status === "completed" && "line-through"
            )}>
              {todo.content}
            </p>
            
            {/* Todo metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {todo.id && (
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  <span className="font-mono">{todo.id}</span>
                </div>
              )}
              {todo.dependencies?.length > 0 && (
                <div className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  <span>{todo.dependencies.length} deps</span>
                </div>
              )}
            </div>
            
            {/* Expanded details */}
            <AnimatePresence>
              {isExpanded && todo.dependencies?.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 mt-2 border-t space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Dependencies:</span>
                    <div className="flex flex-wrap gap-1">
                      {todo.dependencies.map((dep: string) => (
                        <Badge
                          key={dep}
                          variant="outline"
                          className="text-xs font-mono"
                        >
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  };

  // Render statistics view
  const StatsView = () => (
    <div className="space-y-3">
      {/* Overall Progress */}
      <div className="rounded-md bg-muted/20 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Overall Progress</span>
          <span className="text-sm font-semibold text-primary">{stats.completionRate}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.completionRate}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-primary/80"
          />
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = stats[status as keyof typeof stats] || 0;
          const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

          return (
            <div key={status} className="rounded-md bg-muted/20 p-2.5 flex items-center gap-2">
              <div className={config.color}>{config.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">{config.label}</p>
                <p className="text-sm font-semibold">{count} <span className="text-[10px] font-normal text-muted-foreground">{percentage}%</span></p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Chart */}
      <div className="rounded-md bg-muted/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">Activity</span>
        </div>
        <div className="space-y-1.5">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = stats[status as keyof typeof stats] || 0;
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

            return (
              <div key={status} className="flex items-center gap-2">
                <span className="text-[10px] w-16 text-right text-muted-foreground">{config.label}</span>
                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className={cn("h-full", config.bgColor)}
                  />
                </div>
                <span className="text-[10px] w-8 text-left text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Render board view
  const BoardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.entries(todosByStatus).map(([status, todos]) => {
        const config = statusConfig[status as keyof typeof statusConfig];
        
        return (
          <div key={status} className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <div className={config.color}>{config.icon}</div>
              <h3 className="text-sm font-medium">{config.label}</h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                {todos.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {todos.map(todo => (
                <TodoCard 
                  key={todo.id || todos.indexOf(todo)} 
                  todo={todo} 
                  isExpanded={expandedTodos.has(todo.id)}
                />
              ))}
              {todos.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No todos
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render timeline view
  const TimelineView = () => {
    // Group todos by their dependencies to create a timeline
    const rootTodos = todos.filter(t => !t.dependencies || t.dependencies.length === 0);
    const rendered = new Set<string>();
    
    const renderTodoWithDependents = (todo: any, level = 0) => {
      if (rendered.has(todo.id)) return null;
      rendered.add(todo.id);
      
      const dependents = todos.filter(t => 
        t.dependencies?.includes(todo.id) && !rendered.has(t.id)
      );
      
      return (
        <div key={todo.id} className="relative">
          {level > 0 && (
            <div className="absolute left-6 top-0 w-px h-6 bg-border" />
          )}
          <div className={cn("flex gap-4", level > 0 && "ml-12")}>
            <div className="relative">
              <div className={cn(
                "w-3 h-3 rounded-full border-2 bg-background",
                statusConfig[todo.status as keyof typeof statusConfig]?.borderColor
              )} />
              {dependents.length > 0 && (
                <div className="absolute left-1/2 top-3 w-px h-full bg-border -translate-x-1/2" />
              )}
            </div>
            <div className="flex-1 pb-6">
              <TodoCard 
                todo={todo} 
                isExpanded={expandedTodos.has(todo.id)}
              />
            </div>
          </div>
          {dependents.map(dep => renderTodoWithDependents(dep, level + 1))}
        </div>
      );
    };
    
    return (
      <div className="space-y-4">
        {rootTodos.map(todo => renderTodoWithDependents(todo))}
        {todos.filter(t => !rendered.has(t.id)).map(todo => renderTodoWithDependents(todo))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListChecks className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-medium">Todo Overview</h3>
            <p className="text-xs text-muted-foreground">
              {stats.total} total • {stats.completed} completed • {stats.completionRate}% done
            </p>
          </div>
        </div>
        
        {/* Export Options */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={exportAsJson}
          >
            <Download className="h-3 w-3 mr-1" />
            JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={exportAsMarkdown}
          >
            <Download className="h-3 w-3 mr-1" />
            Markdown
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search todos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 bg-muted rounded-md">
            {["all", "pending", "in_progress", "completed", "cancelled"].map(status => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? "default" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? "All" : statusConfig[status as keyof typeof statusConfig]?.label}
                {status === "all" && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    {stats.total}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list" className="text-xs">
            <LayoutList className="h-4 w-4 mr-1" />
            List
          </TabsTrigger>
          <TabsTrigger value="board" className="text-xs">
            <LayoutGrid className="h-4 w-4 mr-1" />
            Board
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">
            <GitBranch className="h-4 w-4 mr-1" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">
            <BarChart3 className="h-4 w-4 mr-1" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredTodos.map(todo => (
                <TodoCard 
                  key={todo.id || filteredTodos.indexOf(todo)} 
                  todo={todo} 
                  isExpanded={expandedTodos.has(todo.id)}
                />
              ))}
            </AnimatePresence>
            {filteredTodos.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" 
                  ? "No todos match your filters" 
                  : "No todos available"}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <BoardView />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TimelineView />
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <StatsView />
        </TabsContent>
      </Tabs>
    </div>
  );
};
