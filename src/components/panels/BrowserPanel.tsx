import React, { useState, useRef, useCallback } from 'react';
import { Globe, ArrowLeft, ArrowRight, RotateCw, ExternalLink, Home, X } from 'lucide-react';

interface BrowserPanelProps {
  projectPath?: string;
}

const BrowserPanel: React.FC<BrowserPanelProps> = ({ projectPath }) => {
  const [url, setUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const normalizeUrl = (raw: string): string => {
    let u = raw.trim();
    if (!u) return '';
    // localhost shorthand
    if (/^\d+$/.test(u)) return `http://localhost:${u}`;
    if (u.startsWith('localhost')) return `http://${u}`;
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    return u;
  };

  const navigate = useCallback((targetUrl: string) => {
    const normalized = normalizeUrl(targetUrl);
    if (!normalized) return;
    setUrl(normalized);
    setInputUrl(normalized);
    setError(null);
    setIsLoading(true);
    // Push to history
    const newHistory = [...history.slice(0, historyIndex + 1), normalized];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setInputUrl(history[newIndex]);
    }
  }, [history, historyIndex]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setInputUrl(history[newIndex]);
    }
  }, [history, historyIndex]);

  const refresh = useCallback(() => {
    if (iframeRef.current && url) {
      setIsLoading(true);
      iframeRef.current.src = url;
    }
  }, [url]);

  const openExternal = useCallback(async () => {
    if (!url) return;
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch {
      window.open(url, '_blank');
    }
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(inputUrl);
  };

  const quickLinks = [
    { label: 'localhost:3000', url: 'http://localhost:3000' },
    { label: 'localhost:5173', url: 'http://localhost:5173' },
    { label: 'localhost:8080', url: 'http://localhost:8080' },
    { label: 'localhost:4200', url: 'http://localhost:4200' },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border">
        <button
          onClick={goBack}
          disabled={historyIndex <= 0}
          className="p-1.5 rounded hover:bg-accent disabled:opacity-30"
          title="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={goForward}
          disabled={historyIndex >= history.length - 1}
          className="p-1.5 rounded hover:bg-accent disabled:opacity-30"
          title="Forward"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button onClick={refresh} className="p-1.5 rounded hover:bg-accent" title="Refresh">
          <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => { setUrl(''); setInputUrl(''); }}
          className="p-1.5 rounded hover:bg-accent"
          title="Home"
        >
          <Home className="h-3.5 w-3.5" />
        </button>

        {/* URL bar */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
          <div className="flex-1 flex items-center gap-1.5 bg-muted/50 rounded-md px-2.5 py-1">
            <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter URL, localhost:port, or just a port number..."
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
              autoFocus
            />
            {inputUrl && (
              <button type="button" onClick={() => setInputUrl('')} className="text-muted-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </form>

        <button onClick={openExternal} disabled={!url} className="p-1.5 rounded hover:bg-accent disabled:opacity-30" title="Open in system browser">
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      {!url ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Globe className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-sm font-medium mb-1">Local Browser</p>
          <p className="text-xs opacity-60 mb-6">Preview local dev servers and web pages</p>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {quickLinks.map(link => (
              <button
                key={link.url}
                onClick={() => navigate(link.url)}
                className="px-3 py-1.5 text-xs bg-muted/50 hover:bg-accent rounded-md border border-border/50 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          <p className="text-[10px] opacity-40 mt-6">
            Type a URL, port number, or localhost address above
          </p>
        </div>
      ) : (
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 z-10">
              <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
          {error && (
            <div className="absolute top-2 left-2 right-2 z-10 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive flex justify-between items-center">
              <span>{error}</span>
              <div className="flex gap-2">
                <button onClick={openExternal} className="underline text-[10px]">Open externally</button>
                <button onClick={() => setError(null)} className="text-destructive/60">Dismiss</button>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={url}
            title="Browser"
            className="absolute inset-0 w-full h-full border-0 bg-white"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Page could not be loaded. Some sites block iframe embedding — try "Open externally".');
            }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}
    </div>
  );
};

export default BrowserPanel;
