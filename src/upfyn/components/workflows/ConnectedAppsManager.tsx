import { useState, useEffect, useCallback } from 'react';
import { Plug, ExternalLink, Loader2, Check, X, RefreshCw, Mail, Calendar, Hash, Github, FileText, MessageCircle, HardDrive, LayoutGrid, Zap, Bug, ListChecks, CreditCard, Phone, Table2, Kanban } from 'lucide-react';
import { api } from '../../utils/api';

interface CatalogEntry {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  connectionId: string | null;
  popularActions: Array<{ slug: string; label: string }>;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  mail: Mail,
  calendar: Calendar,
  hash: Hash,
  github: Github,
  'file-text': FileText,
  'message-circle': MessageCircle,
  'hard-drive': HardDrive,
  'layout-grid': LayoutGrid,
  zap: Zap,
  bug: Bug,
  'list-checks': ListChecks,
  'credit-card': CreditCard,
  phone: Phone,
  table: Table2,
  kanban: Kanban,
};

const BRAND_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  GMAIL: { bg: 'bg-red-500/8', text: 'text-red-400', ring: 'ring-red-500/20' },
  GOOGLECALENDAR: { bg: 'bg-blue-500/8', text: 'text-blue-400', ring: 'ring-blue-500/20' },
  SLACK: { bg: 'bg-purple-500/8', text: 'text-purple-400', ring: 'ring-purple-500/20' },
  GITHUB: { bg: 'bg-neutral-500/8', text: 'text-neutral-300', ring: 'ring-neutral-500/20' },
  NOTION: { bg: 'bg-neutral-500/8', text: 'text-neutral-300', ring: 'ring-neutral-500/20' },
  DISCORD: { bg: 'bg-indigo-500/8', text: 'text-indigo-400', ring: 'ring-indigo-500/20' },
  GOOGLEDRIVE: { bg: 'bg-yellow-500/8', text: 'text-yellow-400', ring: 'ring-yellow-500/20' },
  TRELLO: { bg: 'bg-blue-500/8', text: 'text-blue-400', ring: 'ring-blue-500/20' },
  LINEAR: { bg: 'bg-violet-500/8', text: 'text-violet-400', ring: 'ring-violet-500/20' },
  JIRA: { bg: 'bg-blue-600/8', text: 'text-blue-500', ring: 'ring-blue-600/20' },
  ASANA: { bg: 'bg-rose-500/8', text: 'text-rose-400', ring: 'ring-rose-500/20' },
  STRIPE: { bg: 'bg-violet-500/8', text: 'text-violet-400', ring: 'ring-violet-500/20' },
  TWILIO: { bg: 'bg-red-500/8', text: 'text-red-400', ring: 'ring-red-500/20' },
  AIRTABLE: { bg: 'bg-teal-500/8', text: 'text-teal-400', ring: 'ring-teal-500/20' },
};

const DEFAULT_COLOR = { bg: 'bg-primary/8', text: 'text-primary', ring: 'ring-primary/20' };

export default function ConnectedAppsManager() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [composioAvailable, setComposioAvailable] = useState(false);
  const [connectingApp, setConnectingApp] = useState<string | null>(null);
  const [disconnectingApp, setDisconnectingApp] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      const res = await api.composio.catalog();
      const data = await res.json();
      setCatalog(data.catalog || []);
      setComposioAvailable(data.composioAvailable);
    } catch {
      setComposioAvailable(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const handleConnect = async (appName: string) => {
    setConnectingApp(appName);
    try {
      const res = await api.composio.connect(appName);
      const data = await res.json();
      if (data.redirectUrl) {
        const popup = window.open(data.redirectUrl, 'composio_oauth', 'width=600,height=700,popup=yes');

        const pollInterval = setInterval(async () => {
          try {
            const waitRes = await api.composio.waitForConnection(data.connectedAccountId);
            const waitData = await waitRes.json();
            if (waitData.status === 'ACTIVE') {
              clearInterval(pollInterval);
              popup?.close();
              setConnectingApp(null);
              loadCatalog();
            }
          } catch { /* keep polling */ }
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
          setConnectingApp(null);
        }, 120000);
      }
    } catch {
      setConnectingApp(null);
    }
  };

  const handleDisconnect = async (app: CatalogEntry) => {
    if (!app.connectionId) return;
    setDisconnectingApp(app.id);
    try {
      await api.composio.disconnect(app.connectionId);
      await loadCatalog();
    } catch { /* ignore */ }
    setDisconnectingApp(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground/40">Loading integrations...</span>
      </div>
    );
  }

  if (!composioAvailable) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
          <Plug className="w-7 h-7 text-muted-foreground/25" />
        </div>
        <h4 className="text-sm font-semibold text-foreground tracking-tight mb-1">Composio Not Configured</h4>
        <p className="text-xs text-muted-foreground/50 max-w-xs leading-relaxed">
          Set <code className="px-1 py-0.5 bg-muted/40 rounded text-[10px] font-mono">COMPOSIO_API_KEY</code> in your server environment to unlock 850+ app integrations.
        </p>
      </div>
    );
  }

  const connectedCount = catalog.filter(a => a.connected).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground tracking-tight">Integrations</h3>
          <p className="text-xs text-muted-foreground/50 mt-0.5">
            {connectedCount} of {catalog.length} connected
          </p>
        </div>
        <button
          onClick={loadCatalog}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Integration grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {catalog.map((app, index) => {
          const colors = BRAND_COLORS[app.id] || DEFAULT_COLOR;
          const IconComponent = ICON_MAP[app.icon] || Plug;
          const isConnecting = connectingApp === app.id;
          const isDisconnecting = disconnectingApp === app.id;

          return (
            <div
              key={app.id}
              className={`group relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-200 ${
                app.connected
                  ? 'bg-green-500/[0.03] border-green-500/15 hover:border-green-500/30'
                  : 'bg-card/50 border-border/30 hover:border-border/60 hover:bg-muted/20'
              }`}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {/* Connected indicator */}
              {app.connected && (
                <div className="absolute top-2.5 right-2.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 ring-2 ring-green-400/20" />
                </div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl ${colors.bg} ring-1 ${colors.ring} flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-105`}>
                <IconComponent className={`w-5 h-5 ${colors.text}`} />
              </div>

              {/* Name */}
              <span className="text-xs font-semibold text-foreground mb-0.5">{app.name}</span>
              <span className="text-[10px] text-muted-foreground/40 mb-3">
                {app.popularActions.length} action{app.popularActions.length !== 1 ? 's' : ''}
              </span>

              {/* Action */}
              {app.connected ? (
                <div className="flex items-center gap-2 w-full">
                  <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium flex-1 justify-center">
                    <Check className="w-3 h-3" />
                    Connected
                  </span>
                  <button
                    onClick={() => handleDisconnect(app)}
                    disabled={isDisconnecting}
                    className="p-1 text-muted-foreground/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Disconnect"
                  >
                    {isDisconnecting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnect(app.id)}
                  disabled={isConnecting}
                  className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 text-[11px] font-medium bg-foreground/[0.06] hover:bg-foreground/10 text-foreground rounded-lg transition-colors disabled:opacity-50"
                >
                  {isConnecting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3 h-3" />
                  )}
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
