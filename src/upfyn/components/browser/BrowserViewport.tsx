import { Monitor } from 'lucide-react';

interface BrowserViewportProps {
  viewerUrl: string | null;
  hasSession: boolean;
  isLoading: boolean;
  onNewSession: () => void;
}

export default function BrowserViewport({
  viewerUrl,
  hasSession,
  isLoading,
  onNewSession,
}: BrowserViewportProps) {
  if (!hasSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-muted/10 text-muted-foreground">
        <Monitor className="w-12 h-12 opacity-30" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">No browser session active</p>
          <p className="text-xs opacity-70">Launch a session to start browsing or preview your sandbox apps</p>
        </div>
        <button
          onClick={onNewSession}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isLoading ? 'Launching...' : 'Launch Browser'}
        </button>
      </div>
    );
  }

  if (!viewerUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          Connecting to browser session...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-black">
      <iframe
        src={viewerUrl}
        title="Browser Session"
        className="absolute inset-0 w-full h-full border-0"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
