import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Search, RefreshCw } from 'lucide-react';
import { api, type FileEntry } from '@/lib/api';

interface FileTreePanelProps {
  projectPath: string;
}

interface TreeNode extends FileEntry {
  children?: TreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

const FileTreePanel: React.FC<FileTreePanelProps> = ({ projectPath }) => {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileEntry[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const loadDirectory = useCallback(async (dirPath: string): Promise<TreeNode[]> => {
    const entries = await api.listDirectoryContents(dirPath);
    // Sort: directories first (alphabetical), then files (alphabetical)
    const sorted = [...entries].sort((a, b) => {
      if (a.is_directory && !b.is_directory) return -1;
      if (!a.is_directory && b.is_directory) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return sorted.map(entry => ({
      ...entry,
      isExpanded: false,
      isLoading: false,
      children: entry.is_directory ? undefined : undefined,
    }));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const entries = await loadDirectory(projectPath);
        setTree(entries);
      } catch (err: any) {
        setError(err.message || 'Failed to load directory');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectPath, loadDirectory]);

  const toggleFolder = async (path: string) => {
    const updateTree = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
      const result: TreeNode[] = [];
      for (const node of nodes) {
        if (node.path === path && node.is_directory) {
          if (node.isExpanded) {
            result.push({ ...node, isExpanded: false });
          } else {
            const newNode = { ...node, isLoading: true, isExpanded: true };
            result.push(newNode);
            try {
              const children = await loadDirectory(node.path);
              newNode.children = children;
              newNode.isLoading = false;
            } catch {
              newNode.isLoading = false;
              newNode.children = [];
            }
          }
        } else if (node.children) {
          result.push({ ...node, children: await updateTree(node.children) });
        } else {
          result.push(node);
        }
      }
      return result;
    };
    setTree(await updateTree(tree));
  };

  const handleFileClick = (entry: FileEntry) => {
    if (entry.is_directory) {
      toggleFolder(entry.path);
    } else {
      setSelectedFile(entry.path);
      // Dispatch event to open file in editor tab
      window.dispatchEvent(new CustomEvent('open-file-in-editor', { detail: { filePath: entry.path } }));
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const results = await api.searchFiles(projectPath, searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      const entries = await loadDirectory(projectPath);
      setTree(entries);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (entry: FileEntry) => {
    if (entry.is_directory) {
      return null; // handled by chevron
    }
    return <File className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />;
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isSelected = selectedFile === node.path;
    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-1 py-0.5 px-2 cursor-pointer text-xs hover:bg-accent/50 transition-colors ${
            isSelected ? 'bg-accent text-accent-foreground' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFileClick(node)}
        >
          {node.is_directory ? (
            <>
              {node.isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              )}
              {node.isExpanded ? (
                <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500" />
              ) : (
                <Folder className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500" />
              )}
            </>
          ) : (
            <>
              <span className="w-3.5 flex-shrink-0" />
              {getFileIcon(node)}
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {node.isExpanded && node.isLoading && (
          <div className="text-xs text-muted-foreground py-1" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
            Loading...
          </div>
        )}
        {node.isExpanded && node.children && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (loading && tree.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={refresh} className="text-xs mt-2 underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <div className="flex-1 flex items-center gap-1 bg-muted/50 rounded px-2 py-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <button onClick={refresh} className="p-1 rounded hover:bg-accent" title="Refresh">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Project path */}
      <div className="px-3 py-1 text-[10px] text-muted-foreground/60 truncate border-b border-border/50">
        {projectPath}
      </div>

      {/* Tree or search results */}
      <div className="flex-1 overflow-y-auto py-1">
        {searchResults ? (
          <div>
            <div className="px-3 py-1 text-[10px] text-muted-foreground flex items-center justify-between">
              <span>{searchResults.length} results</span>
              <button onClick={() => { setSearchResults(null); setSearchQuery(''); }} className="underline">Clear</button>
            </div>
            {searchResults.map(entry => (
              <div
                key={entry.path}
                className="flex items-center gap-1 py-0.5 px-3 cursor-pointer text-xs hover:bg-accent/50"
                onClick={() => handleFileClick(entry)}
              >
                {entry.is_directory ? (
                  <Folder className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500" />
                ) : (
                  <File className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{entry.name}</span>
                <span className="text-[10px] text-muted-foreground/50 ml-auto truncate max-w-[40%]">
                  {entry.path.replace(projectPath, '.')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          tree.map(node => renderNode(node))
        )}
      </div>
    </div>
  );
};

export default FileTreePanel;
