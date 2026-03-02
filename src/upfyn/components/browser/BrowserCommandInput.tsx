import { Send, Square, Zap } from 'lucide-react';

interface BrowserCommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  mode: 'chat' | 'autonomous';
  isRunning: boolean;
  hasSession: boolean;
}

export default function BrowserCommandInput({
  value,
  onChange,
  onSubmit,
  onStop,
  mode,
  isRunning,
  hasSession,
}: BrowserCommandInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isRunning) {
        onSubmit();
      }
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-t border-border/40">
      <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border/40 focus-within:border-primary/40 transition-colors">
        {mode === 'autonomous' && (
          <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !hasSession
              ? 'Launch a session first'
              : mode === 'chat'
                ? 'Tell the AI what to do... (e.g., "Click the login button")'
                : 'Set a goal... (e.g., "Fill out the registration form")'
          }
          disabled={!hasSession || isRunning}
          className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
        />
      </div>
      {isRunning ? (
        <button
          onClick={onStop}
          className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          title="Stop"
        >
          <Square className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={!hasSession || !value.trim()}
          className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-opacity"
          title="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
