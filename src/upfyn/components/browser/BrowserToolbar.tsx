import { ArrowLeft, ArrowRight, RotateCw, Globe, X, MonitorPlay, Zap } from 'lucide-react';

interface BrowserToolbarProps {
  url: string;
  onUrlChange: (url: string) => void;
  onNavigate: (url: string) => void;
  onRefresh: () => void;
  mode: 'chat' | 'autonomous';
  onModeChange: (mode: 'chat' | 'autonomous') => void;
  hasSession: boolean;
  onNewSession: () => void;
  onCloseSession: () => void;
  isLoading: boolean;
}

export default function BrowserToolbar({
  url,
  onUrlChange,
  onNavigate,
  onRefresh,
  mode,
  onModeChange,
  hasSession,
  onNewSession,
  onCloseSession,
  isLoading,
}: BrowserToolbarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      let target = url.trim();
      if (target && !target.startsWith('http://') && !target.startsWith('https://')) {
        target = `https://${target}`;
      }
      onNavigate(target);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/40">
      {/* Nav buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onRefresh}
          disabled={!hasSession || isLoading}
          className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          title="Refresh"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* URL bar */}
      <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border border-border/40 focus-within:border-primary/40 transition-colors">
        <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasSession ? 'Enter URL or search...' : 'Launch a browser session first'}
          disabled={!hasSession}
          className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Mode toggle */}
      <div className="flex items-center bg-muted/40 rounded-lg p-0.5">
        <button
          onClick={() => onModeChange('chat')}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
            mode === 'chat'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => onModeChange('autonomous')}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 ${
            mode === 'autonomous'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Zap className="w-3 h-3" />
          Auto
        </button>
      </div>

      {/* Session controls */}
      {hasSession ? (
        <button
          onClick={onCloseSession}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Close browser session"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          onClick={onNewSession}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <MonitorPlay className="w-3.5 h-3.5" />
          Launch
        </button>
      )}
    </div>
  );
}
