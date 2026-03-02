import { useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Terminal } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  detail?: string;
  variant?: 'danger' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  detail,
  variant = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel],
  );

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-card border border-border/40 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isDanger
                  ? 'bg-red-500/10'
                  : 'bg-amber-500/10'
              }`}
            >
              {isDanger ? (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              ) : (
                <Terminal className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
              {detail && (
                <p className="text-[10px] text-muted-foreground/60 mt-2 leading-relaxed">{detail}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border/20">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-xs font-medium rounded-xl transition-opacity ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-foreground hover:opacity-90 text-background'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Hook for imperative confirm-dialog usage (replaces window.confirm)
import { useState } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  detail?: string;
  variant?: 'danger' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const dialogProps = state
    ? {
        isOpen: true,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
        title: state.title,
        message: state.message,
        detail: state.detail,
        variant: state.variant,
        confirmLabel: state.confirmLabel,
        cancelLabel: state.cancelLabel,
      }
    : { isOpen: false, onConfirm: () => {}, onCancel: () => {}, title: '', message: '' };

  return { confirm, dialogProps, ConfirmDialog };
}
