import React, { lazy, Suspense } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Markdown } from '../../../chat/view/subcomponents/Markdown';
import type { Artifact } from '../../hooks/useArtifactPanel';

const ReactDiffViewer = lazy(() => import('react-diff-viewer-continued'));

interface ArtifactPanelProps {
  artifacts: Artifact[];
  recentArtifacts: Artifact[];
  activeArtifactId: string | null;
  panelWidth: number;
  panelExpanded: boolean;
  resizeHandleRef: React.RefObject<HTMLDivElement>;
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSetActive: (id: string) => void;
  onClose: (id: string) => void;
  onReopenArtifact: (id: string) => void;
  onClearHistory: () => void;
  onCloseAll: () => void;
  onToggleExpand: () => void;
  onPinToCanvas?: (artifact: Artifact) => void;
  onFileOpen?: (filePath: string, diffInfo?: any) => void;
}

const diffThemeStyles = {
  variables: {
    dark: {
      diffViewerBackground: '#0f172a',
      diffViewerColor: '#e2e8f0',
      addedBackground: '#064e3b20',
      addedColor: '#6ee7b7',
      removedBackground: '#7f1d1d20',
      removedColor: '#fca5a5',
      wordAddedBackground: '#065f4630',
      wordRemovedBackground: '#991b1b30',
      addedGutterBackground: '#064e3b30',
      removedGutterBackground: '#7f1d1d30',
      gutterBackground: '#0f172a',
      gutterBackgroundDark: '#0f172a',
      highlightBackground: '#1e293b',
      highlightGutterBackground: '#1e293b',
      codeFoldGutterBackground: '#1e293b',
      codeFoldBackground: '#1e293b',
      emptyLineBackground: '#0f172a',
      gutterColor: '#475569',
      addedGutterColor: '#6ee7b7',
      removedGutterColor: '#fca5a5',
      codeFoldContentColor: '#94a3b8',
      diffViewerTitleBackground: '#1e293b',
      diffViewerTitleColor: '#e2e8f0',
      diffViewerTitleBorderColor: '#334155',
    },
  },
  line: {
    padding: '2px 8px',
    fontSize: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  gutter: {
    padding: '2px 8px',
    fontSize: '11px',
    minWidth: '36px',
  },
  contentText: {
    fontSize: '12px',
    lineHeight: '20px',
  },
};

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    java: 'java', kt: 'kotlin', swift: 'swift', c: 'c', cpp: 'cpp',
    h: 'c', hpp: 'cpp', cs: 'csharp', php: 'php',
    html: 'html', css: 'css', scss: 'scss', less: 'less',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    xml: 'xml', sql: 'sql', sh: 'bash', bash: 'bash', zsh: 'bash',
    md: 'markdown', mdx: 'markdown', graphql: 'graphql',
    dockerfile: 'docker', tf: 'hcl', lua: 'lua', r: 'r',
    vue: 'html', svelte: 'html',
  };
  return map[ext] || 'text';
}

function CodeArtifact({ data }: { data: Record<string, any> }) {
  const [copied, setCopied] = React.useState(false);
  const language = data.language || getLanguageFromPath(data.filePath || '');
  const content = data.content || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/60 border-b border-gray-700/50">
        <span className="text-xs text-gray-400 font-mono truncate">{data.filePath || 'code'}</span>
        <button
          onClick={handleCopy}
          className="text-[10px] px-2 py-0.5 rounded border border-gray-600 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '0.8125rem',
            padding: '1rem',
            minHeight: '100%',
          }}
          showLineNumbers
          lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#475569' }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

function DiffArtifact({ data }: { data: Record<string, any> }) {
  const [splitView, setSplitView] = React.useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/60 border-b border-gray-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-400 font-mono truncate">{data.filePath || 'diff'}</span>
          <span className={`text-[10px] font-medium px-1.5 py-px rounded flex-shrink-0 ${
            data.badge === 'New'
              ? 'bg-green-900/30 text-green-400'
              : 'bg-gray-800 text-gray-400'
          }`}>
            {data.badge || 'Diff'}
          </span>
        </div>
        <button
          onClick={() => setSplitView(!splitView)}
          className="text-[10px] px-2 py-0.5 rounded border border-gray-600 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
        >
          {splitView ? 'Unified' : 'Split'}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <Suspense fallback={
          <div className="p-4 text-xs text-gray-500">Loading diff viewer...</div>
        }>
          <ReactDiffViewer
            oldValue={data.oldContent || ''}
            newValue={data.newContent || ''}
            splitView={splitView}
            useDarkTheme={true}
            styles={diffThemeStyles}
            hideLineNumbers={false}
            showDiffOnly={true}
            extraLinesSurroundingDiff={3}
          />
        </Suspense>
      </div>
    </div>
  );
}

function TerminalArtifact({ data }: { data: Record<string, any> }) {
  const [copied, setCopied] = React.useState(false);
  const output = data.output || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/60 border-b border-gray-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-green-400 font-mono">$</span>
          <span className="text-xs text-gray-300 font-mono truncate">{data.command || 'terminal'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="text-[10px] px-2 py-0.5 rounded border border-gray-600 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-gray-950 p-3">
        <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
          {output}
        </pre>
      </div>
    </div>
  );
}

function SearchArtifact({ data, onFileOpen }: { data: Record<string, any>; onFileOpen?: (path: string) => void }) {
  const files: string[] = data.files || [];
  const pattern = data.pattern || '';

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/60 border-b border-gray-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-400">Search:</span>
          <span className="text-xs text-gray-300 font-mono truncate">{pattern}</span>
        </div>
        <span className="text-[10px] text-gray-500 flex-shrink-0">{files.length} files</span>
      </div>
      <div className="flex-1 overflow-auto">
        {files.length === 0 ? (
          <div className="p-4 text-xs text-gray-500 text-center">No files found</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {files.map((file, idx) => (
              <button
                key={idx}
                onClick={() => onFileOpen?.(file)}
                className="w-full text-left px-3 py-1.5 text-xs font-mono text-blue-400 hover:text-blue-300 hover:bg-gray-800/50 transition-colors truncate"
              >
                {file}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HtmlArtifact({ data }: { data: Record<string, any> }) {
  const html = data.html || '';

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/60 border-b border-gray-700/50">
        <span className="text-xs text-gray-400">Preview</span>
      </div>
      <div className="flex-1 overflow-hidden bg-white">
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          className="w-full h-full border-0"
          title="HTML Preview"
        />
      </div>
    </div>
  );
}

function MarkdownArtifact({ data }: { data: Record<string, any> }) {
  const content = data.content || '';

  return (
    <div className="h-full flex flex-col overflow-auto p-4">
      <Markdown className="prose prose-sm max-w-none dark:prose-invert text-sm text-gray-300">
        {content}
      </Markdown>
    </div>
  );
}

function ArtifactContent({ artifact, onFileOpen }: { artifact: Artifact; onFileOpen?: (path: string) => void }) {
  switch (artifact.type) {
    case 'code':
      return <CodeArtifact data={artifact.data} />;
    case 'diff':
      return <DiffArtifact data={artifact.data} />;
    case 'terminal':
      return <TerminalArtifact data={artifact.data} />;
    case 'search':
      return <SearchArtifact data={artifact.data} onFileOpen={onFileOpen} />;
    case 'html':
      return <HtmlArtifact data={artifact.data} />;
    case 'markdown':
      return <MarkdownArtifact data={artifact.data} />;
    default:
      return <div className="p-4 text-xs text-gray-500">Unknown artifact type</div>;
  }
}

const typeIcons: Record<string, string> = {
  code: '📄',
  diff: '±',
  terminal: '$',
  search: '🔍',
  html: '🌐',
  markdown: '📝',
};

export default function ArtifactPanel({
  artifacts,
  recentArtifacts,
  activeArtifactId,
  panelWidth,
  panelExpanded,
  resizeHandleRef,
  onResizeStart,
  onSetActive,
  onClose,
  onReopenArtifact,
  onClearHistory,
  onCloseAll,
  onToggleExpand,
  onPinToCanvas,
  onFileOpen,
}: ArtifactPanelProps) {
  const [showRecent, setShowRecent] = React.useState(false);

  if (artifacts.length === 0 && recentArtifacts.length === 0) {
    return null;
  }

  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId) || artifacts[0];

  return (
    <>
      {/* Resize handle */}
      {!panelExpanded && (
        <div
          ref={resizeHandleRef}
          onMouseDown={onResizeStart}
          className="flex-shrink-0 w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-600 cursor-col-resize transition-colors relative group"
          title="Drag to resize"
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-blue-500 dark:bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      <div
        className={`flex-shrink-0 border-l border-gray-200 dark:border-gray-700 h-full overflow-hidden flex flex-col bg-gray-900 ${panelExpanded ? 'flex-1' : ''}`}
        style={panelExpanded ? undefined : { width: `${panelWidth}px` }}
      >
        {/* Tab bar */}
        <div className="flex items-center bg-gray-800/80 border-b border-gray-700/50 min-h-[36px]">
          <div className="flex-1 flex items-center overflow-x-auto scrollbar-none">
            {artifacts.map((artifact) => (
              <button
                key={artifact.id}
                onClick={() => onSetActive(artifact.id)}
                className={`group/tab flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs border-r border-gray-700/30 whitespace-nowrap transition-colors ${
                  artifact.id === activeArtifact?.id
                    ? 'bg-gray-900 text-gray-200'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <span className="text-[10px] opacity-60">{typeIcons[artifact.type] || '•'}</span>
                <span className="max-w-[120px] truncate">{artifact.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(artifact.id);
                  }}
                  className="ml-1 opacity-0 group-hover/tab:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity"
                  aria-label="Close tab"
                >
                  ×
                </button>
              </button>
            ))}
          </div>

          {/* Panel controls */}
          <div className="flex items-center gap-0.5 px-1.5 flex-shrink-0">
            {onPinToCanvas && activeArtifact && (
              <button
                onClick={() => onPinToCanvas(activeArtifact)}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Pin to canvas"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {recentArtifacts.length > 0 && (
              <button
                onClick={() => setShowRecent(!showRecent)}
                className={`p-1 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${showRecent ? 'text-gray-200' : 'text-gray-500 hover:text-gray-300'}`}
                title={`Recent (${recentArtifacts.length})`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            <button
              onClick={onToggleExpand}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={panelExpanded ? 'Restore size' : 'Expand'}
            >
              {panelExpanded ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
            <button
              onClick={onCloseAll}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Close all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Artifact content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeArtifact ? (
            <ArtifactContent artifact={activeArtifact} onFileOpen={onFileOpen} />
          ) : artifacts.length === 0 && recentArtifacts.length > 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              No open artifacts. Check recent history below.
            </div>
          ) : null}
        </div>

        {/* Recent artifacts section */}
        {showRecent && recentArtifacts.length > 0 && (
          <div className="border-t border-gray-700/50 max-h-[200px] overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/60 sticky top-0">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Recent ({recentArtifacts.length})</span>
              <button
                onClick={onClearHistory}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="divide-y divide-gray-800/30">
              {recentArtifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  onClick={() => onReopenArtifact(artifact.id)}
                  className="w-full text-left px-3 py-2.5 sm:py-1.5 text-xs hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                >
                  <span className="text-[10px] opacity-60 flex-shrink-0">{typeIcons[artifact.type] || '•'}</span>
                  <span className="text-gray-400 truncate">{artifact.title}</span>
                  <span className="ml-auto text-[10px] text-gray-600 flex-shrink-0">{artifact.type}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
