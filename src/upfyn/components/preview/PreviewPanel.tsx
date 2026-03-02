import React, { useCallback, useEffect, useRef, useState } from 'react';

interface PreviewPanelProps {
  initialHtml?: string;
}

type ViewportSize = '320' | '768' | '100%';

const VIEWPORT_PRESETS: { label: string; value: ViewportSize; icon: string }[] = [
  { label: 'Mobile', value: '320', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { label: 'Tablet', value: '768', icon: 'M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { label: 'Desktop', value: '100%', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];

const CONSOLE_INJECT_SCRIPT = `
<script>
(function() {
  var origLog = console.log;
  var origError = console.error;
  var origWarn = console.warn;
  function send(level, args) {
    try {
      window.parent.postMessage({ type: 'preview-console', level: level, message: Array.from(args).map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ') }, '*');
    } catch(e) {}
  }
  console.log = function() { send('log', arguments); origLog.apply(console, arguments); };
  console.error = function() { send('error', arguments); origError.apply(console, arguments); };
  console.warn = function() { send('warn', arguments); origWarn.apply(console, arguments); };
  window.onerror = function(msg, url, line) { send('error', [msg + ' (line ' + line + ')']); };
})();
</script>
`;

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; color: #1a1a1a; }
    h1 { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Live Preview</h1>
  <p>Paste or write HTML here to preview it live.</p>
</body>
</html>`;

export default function PreviewPanel({ initialHtml }: PreviewPanelProps) {
  const [html, setHtml] = useState(initialHtml || DEFAULT_HTML);
  const [viewportWidth, setViewportWidth] = useState<ViewportSize>('100%');
  const [showSource, setShowSource] = useState(!initialHtml);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<{ level: string; message: string }[]>([]);
  const [iframeKey, setIframeKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Listen for console messages from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'preview-console') {
        setConsoleOutput((prev) => [...prev.slice(-99), { level: event.data.level, message: event.data.message }]);
        if (!showConsole) setShowConsole(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [showConsole]);

  // Update when initialHtml changes
  useEffect(() => {
    if (initialHtml) {
      setHtml(initialHtml);
      setShowSource(false);
    }
  }, [initialHtml]);

  const handleRefresh = useCallback(() => {
    setIframeKey((k) => k + 1);
    setConsoleOutput([]);
  }, []);

  // Inject console capture script into HTML
  const srcDoc = html.includes('<head>')
    ? html.replace('<head>', `<head>${CONSOLE_INJECT_SCRIPT}`)
    : CONSOLE_INJECT_SCRIPT + html;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 flex-shrink-0">
        {/* Viewport buttons */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {VIEWPORT_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setViewportWidth(preset.value)}
              className={`px-2 py-1 rounded-md text-xs transition-colors ${
                viewportWidth === preset.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={`${preset.label}${preset.value !== '100%' ? ` (${preset.value}px)` : ''}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={preset.icon} />
              </svg>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Refresh preview"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* Console toggle */}
        <button
          onClick={() => setShowConsole(!showConsole)}
          className={`p-1.5 rounded-md transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
            showConsole ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title="Toggle console"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Source toggle */}
        <button
          onClick={() => setShowSource(!showSource)}
          className={`p-1.5 rounded-md transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
            showSource ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title="Toggle source editor"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
        {/* Source editor */}
        {showSource && (
          <div className="w-full sm:w-1/2 max-h-[40vh] sm:max-h-none border-b sm:border-b-0 border-r-0 sm:border-r border-border flex flex-col min-h-0">
            <div className="px-3 py-1.5 border-b border-border/50 bg-muted/20 flex-shrink-0">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Source</span>
            </div>
            <textarea
              ref={textareaRef}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="flex-1 w-full resize-none bg-card text-foreground font-mono text-xs p-3 outline-none overflow-auto"
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview iframe */}
        <div className="flex-1 flex items-start justify-center bg-gray-100 dark:bg-gray-900/50 p-4 overflow-auto min-h-0">
          <div
            className="bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-200 h-full"
            style={{ width: viewportWidth === '100%' ? '100%' : `${viewportWidth}px`, maxWidth: '100%' }}
          >
            <iframe
              key={iframeKey}
              srcDoc={srcDoc}
              sandbox="allow-scripts"
              className="w-full h-full border-0"
              title="Preview"
            />
          </div>
        </div>
      </div>

      {/* Console output */}
      {showConsole && (
        <div className="border-t border-border max-h-[150px] overflow-y-auto bg-gray-950 flex-shrink-0">
          <div className="flex items-center justify-between px-3 py-1 border-b border-gray-800 sticky top-0 bg-gray-950">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Console</span>
            <button
              onClick={() => setConsoleOutput([])}
              className="text-[10px] text-gray-500 hover:text-gray-300"
            >
              Clear
            </button>
          </div>
          {consoleOutput.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-600">No console output</div>
          ) : (
            <div className="divide-y divide-gray-800/30">
              {consoleOutput.map((entry, i) => (
                <div
                  key={i}
                  className={`px-3 py-1 text-xs font-mono ${
                    entry.level === 'error' ? 'text-red-400 bg-red-900/10' :
                    entry.level === 'warn' ? 'text-yellow-400 bg-yellow-900/10' :
                    'text-gray-300'
                  }`}
                >
                  <span className="text-[10px] opacity-50 mr-2">{entry.level}</span>
                  {entry.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
