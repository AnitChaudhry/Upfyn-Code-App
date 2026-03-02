import { createContext, useContext, useMemo } from 'react';

// Tauri desktop stub — no WebSocket server needed.
// Components that call useWebSocket() get a safe no-op interface.

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type WebSocketContextType = {
  ws: WebSocket | null;
  sendMessage: (message: any) => void;
  latestMessage: any | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectAttempts: number;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  // Desktop: always "connected" since everything runs locally
  const value: WebSocketContextType = useMemo(
    () => ({
      ws: null,
      sendMessage: () => {},
      latestMessage: null,
      isConnected: true,
      connectionState: 'connected' as ConnectionState,
      reconnectAttempts: 0,
    }),
    [],
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;
