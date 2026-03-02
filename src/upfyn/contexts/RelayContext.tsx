import { createContext, useContext, useMemo } from 'react';

// Tauri desktop stub — the desktop app IS local, so relay is always "connected".
// Components that check isRelayConnected will see true.

type AgentInfo = { installed: boolean; label: string; path?: string };
type RelayAgents = Record<string, AgentInfo> | null;

type RelayContextType = {
  isRelayConnected: boolean;
  relayConnectedAt: string | null;
  relayCwd: string | null;
  relayMachine: string | null;
  relayPlatform: string | null;
  relayAgents: RelayAgents;
  sandboxActive: boolean;
  isChecking: boolean;
  isDisconnecting: boolean;
  recheckStatus: () => Promise<void>;
  disconnect: () => Promise<boolean>;
};

const RelayContext = createContext<RelayContextType | null>(null);

export const useRelay = () => {
  const context = useContext(RelayContext);
  if (!context) {
    throw new Error('useRelay must be used within a RelayProvider');
  }
  return context;
};

export const RelayProvider = ({ children }: { children: React.ReactNode; latestMessage?: any }) => {
  const value: RelayContextType = useMemo(
    () => ({
      isRelayConnected: true, // Desktop app is always local
      relayConnectedAt: new Date().toISOString(),
      relayCwd: null,
      relayMachine: 'local',
      relayPlatform: navigator.platform,
      relayAgents: {
        claude: { installed: true, label: 'Claude Code' },
      },
      sandboxActive: false,
      isChecking: false,
      isDisconnecting: false,
      recheckStatus: async () => {},
      disconnect: async () => true,
    }),
    [],
  );

  return (
    <RelayContext.Provider value={value}>
      {children}
    </RelayContext.Provider>
  );
};

export default RelayContext;
