import { useWebSocket } from '../../contexts/WebSocketContext';

export default function WebSocketReconnectBanner() {
  const { connectionState, reconnectAttempts } = useWebSocket();

  if (connectionState === 'connected' || connectionState === 'disconnected') return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs animate-in fade-in duration-300">
      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shrink-0" />
      <span>
        {connectionState === 'connecting' ? 'Connecting...' : (
          <>
            Reconnecting to server
            {reconnectAttempts > 1 && <span className="text-amber-400/60 ml-1">(attempt {reconnectAttempts})</span>}
            <span className="ml-1.5">— your session is preserved</span>
          </>
        )}
      </span>
    </div>
  );
}
