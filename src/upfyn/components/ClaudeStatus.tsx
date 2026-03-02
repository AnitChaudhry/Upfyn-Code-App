interface ClaudeStatusProps {
  status: { text: string; tokens: number; can_interrupt: boolean } | null;
  isLoading: boolean;
  onAbort: () => void;
  provider: string;
}

export default function ClaudeStatus({ status, isLoading, onAbort, provider }: ClaudeStatusProps) {
  if (!status && !isLoading) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
      {isLoading && (
        <>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>{status?.text || `${provider || 'Agent'} is working...`}</span>
          {status?.can_interrupt && (
            <button
              onClick={onAbort}
              className="ml-auto text-xs text-destructive hover:text-destructive/80 transition-colors"
            >
              Stop
            </button>
          )}
        </>
      )}
      {!isLoading && status && (
        <>
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>{status.text}</span>
        </>
      )}
    </div>
  );
}
