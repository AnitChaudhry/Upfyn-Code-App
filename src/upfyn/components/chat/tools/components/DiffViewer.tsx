import React, { useMemo, useState, lazy, Suspense } from 'react';

const ReactDiffViewer = lazy(() => import('react-diff-viewer-continued'));

type DiffLine = {
  type: string;
  content: string;
  lineNum: number;
};

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  filePath: string;
  createDiff: (oldStr: string, newStr: string) => DiffLine[];
  onFileClick?: () => void;
  badge?: string;
  badgeColor?: 'gray' | 'green';
}

const darkThemeStyles = {
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

/**
 * Enhanced diff viewer — split/unified toggle with word-level highlighting
 */
export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldContent,
  newContent,
  filePath,
  createDiff,
  onFileClick,
  badge = 'Diff',
  badgeColor = 'gray'
}) => {
  const [splitView, setSplitView] = useState(false);
  const [copied, setCopied] = useState(false);

  const badgeClasses = badgeColor === 'green'
    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';

  // Compute stats
  const stats = useMemo(() => {
    const diffLines = createDiff(oldContent, newContent);
    const added = diffLines.filter(l => l.type === 'added').length;
    const removed = diffLines.filter(l => l.type === 'removed').length;
    return { added, removed };
  }, [createDiff, oldContent, newContent]);

  const handleCopyNew = () => {
    navigator.clipboard.writeText(newContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <div className="border border-gray-200/60 dark:border-gray-700/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-200/60 dark:border-gray-700/50">
        <div className="flex items-center gap-2 min-w-0">
          {onFileClick ? (
            <button
              onClick={onFileClick}
              className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 truncate cursor-pointer transition-colors"
            >
              {filePath}
            </button>
          ) : (
            <span className="text-[11px] font-mono text-gray-600 dark:text-gray-400 truncate">
              {filePath}
            </span>
          )}
          <span className={`text-[10px] font-medium px-1.5 py-px rounded ${badgeClasses} flex-shrink-0`}>
            {badge}
          </span>
          {stats.added > 0 && (
            <span className="text-[10px] text-green-600 dark:text-green-400 font-mono flex-shrink-0">+{stats.added}</span>
          )}
          {stats.removed > 0 && (
            <span className="text-[10px] text-red-600 dark:text-red-400 font-mono flex-shrink-0">-{stats.removed}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button
            onClick={() => setSplitView(!splitView)}
            className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={splitView ? 'Unified view' : 'Split view'}
          >
            {splitView ? 'Unified' : 'Split'}
          </button>
          <button
            onClick={handleCopyNew}
            className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Copy new content"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className="max-h-[500px] overflow-auto">
        <Suspense fallback={
          <div className="p-4 text-xs text-gray-500 dark:text-gray-400">Loading diff viewer...</div>
        }>
          <ReactDiffViewer
            oldValue={oldContent}
            newValue={newContent}
            splitView={splitView}
            useDarkTheme={true}
            styles={darkThemeStyles}
            hideLineNumbers={false}
            showDiffOnly={true}
            extraLinesSurroundingDiff={3}
          />
        </Suspense>
      </div>
    </div>
  );
};
