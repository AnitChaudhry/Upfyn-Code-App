import { ChevronRight, AlertTriangle, CheckCircle2, Loader2, MousePointerClick, Eye, FileText, Wrench, X } from 'lucide-react';

export interface ActionLogEntry {
  id: string;
  step: number;
  type: 'act' | 'extract' | 'observe' | 'navigate' | 'error' | 'info';
  instruction: string;
  result?: string;
  timestamp: number;
  status: 'running' | 'done' | 'error';
}

export interface ConsoleError {
  message: string;
  source?: string;
  line?: number;
  timestamp: number;
}

interface BrowserActionLogProps {
  actions: ActionLogEntry[];
  consoleErrors: ConsoleError[];
  isVisible: boolean;
  onClose: () => void;
  onFixError: (error: ConsoleError) => void;
}

const typeIcon: Record<ActionLogEntry['type'], typeof MousePointerClick> = {
  act: MousePointerClick,
  extract: FileText,
  observe: Eye,
  navigate: ChevronRight,
  error: AlertTriangle,
  info: ChevronRight,
};

export default function BrowserActionLog({
  actions,
  consoleErrors,
  isVisible,
  onClose,
  onFixError,
}: BrowserActionLogProps) {
  if (!isVisible) return null;

  return (
    <div className="w-64 flex-shrink-0 border-l border-border/40 bg-muted/10 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <span className="text-xs font-medium text-foreground">Action Log</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted/60 text-muted-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex-1 overflow-y-auto">
        {actions.length === 0 && consoleErrors.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground/60 text-center">
            AI actions and console errors will appear here
          </div>
        )}

        {actions.map((action) => {
          const Icon = typeIcon[action.type] || ChevronRight;
          return (
            <div
              key={action.id}
              className="px-3 py-2 border-b border-border/20 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  {action.status === 'running' ? (
                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  ) : action.status === 'error' ? (
                    <AlertTriangle className="w-3 h-3 text-destructive" />
                  ) : (
                    <Icon className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground/60 font-mono">
                      #{action.step}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground/60 font-medium">
                      {action.type}
                    </span>
                  </div>
                  <p className="text-xs text-foreground truncate">{action.instruction}</p>
                  {action.result && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {action.result}
                    </p>
                  )}
                </div>
                {action.status === 'done' && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                )}
              </div>
            </div>
          );
        })}

        {/* Console Errors Section */}
        {consoleErrors.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-destructive/5 border-y border-destructive/10">
              <span className="text-[10px] font-medium text-destructive uppercase tracking-wide">
                Console Errors ({consoleErrors.length})
              </span>
            </div>
            {consoleErrors.map((error, i) => (
              <div
                key={`err-${i}`}
                className="px-3 py-2 border-b border-border/20 hover:bg-destructive/5 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground line-clamp-3 font-mono">
                      {error.message}
                    </p>
                    {error.source && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {error.source}{error.line ? `:${error.line}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onFixError(error)}
                  className="mt-1.5 flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                >
                  <Wrench className="w-2.5 h-2.5" />
                  Fix this error
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
