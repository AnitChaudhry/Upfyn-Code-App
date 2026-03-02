import { useState, useCallback } from 'react';
import { WifiOff, Wifi, Power } from 'lucide-react';
import { useRelay } from '../../contexts/RelayContext';
import { IS_PLATFORM } from '../../constants/config';

export default function ConnectionBanner() {
  const { isRelayConnected, isChecking, sandboxActive, isDisconnecting, disconnect, relayCwd, relayMachine } = useRelay();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDisconnect = useCallback(async () => {
    const success = await disconnect();
    if (success) setShowConfirm(false);
  }, [disconnect]);

  // In local/platform mode, no relay needed — hide banner entirely
  if (IS_PLATFORM) return null;

  // Don't render anything while checking
  if (isChecking) return null;

  // Connected state — compact green bar
  if (isRelayConnected) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 bg-green-500/5 border-b border-green-500/15 text-sm">
        <Wifi className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        <span className="text-green-400 text-xs font-medium">Connected</span>
        {relayMachine && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{relayMachine}</span>
        )}
        {relayCwd && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[200px] hidden sm:inline">
            {relayCwd.split(/[\\/]/).slice(-2).join('/')}
          </span>
        )}
        {sandboxActive && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Isolated
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {showConfirm ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-amber-400">Disconnect?</span>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-40"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Yes'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
              title="Disconnect relay"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Disconnected state — compact one-liner pointing to Settings
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-amber-500/20 bg-amber-500/5">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      <span className="text-xs text-amber-300">Machine not connected</span>
      <span className="text-[10px] text-muted-foreground">—</span>
      <span className="text-[10px] text-muted-foreground">
        Go to <span className="text-foreground font-medium">Settings &gt; Connection</span> to connect
      </span>
    </div>
  );
}
