import { useState, useEffect, useRef } from 'react';
import { Plug, ExternalLink, Plus, Loader2, X, Sparkles } from 'lucide-react';
import { CATALOG_BY_ID } from '../../../../shared/integrationCatalog.js';
import { api } from '../../utils/api';

interface KeywordSuggestionPopupProps {
  keyword: string;
  integrationId: string;
  integrationName: string;
  position: { top: number; left: number };
  onDismiss: () => void;
  onAddAction: (integrationId: string, toolSlug: string, label: string) => void;
}

export default function KeywordSuggestionPopup({
  keyword,
  integrationId,
  integrationName,
  position,
  onDismiss,
  onAddAction,
}: KeywordSuggestionPopupProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const catalogEntry = CATALOG_BY_ID[integrationId];
  const actions = catalogEntry?.popularActions || [];

  useEffect(() => {
    api.composio.catalog().then(r => r.json()).then(data => {
      const entry = (data.catalog || []).find((c: any) => c.id === integrationId);
      setConnected(entry?.connected || false);
    }).catch(() => setConnected(false));
  }, [integrationId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onDismiss]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await api.composio.connect(integrationId);
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
              setConnected(true);
              setConnecting(false);
            }
          } catch { /* keep polling */ }
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
          setConnecting(false);
        }, 120000);
      }
    } catch {
      setConnecting(false);
    }
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-card border border-border/40 rounded-2xl shadow-2xl overflow-hidden min-w-[240px] max-w-[300px]"
      style={{ top: position.top, left: Math.min(position.left, window.innerWidth - 320) }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/20 border-b border-border/20">
        <div className="p-1.5 rounded-lg bg-cyan-500/10">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-foreground">{integrationName}</div>
          <div className="text-[10px] text-muted-foreground/40">
            Detected "<span className="text-primary/60 font-medium">{keyword}</span>"
          </div>
        </div>
        <button onClick={onDismiss} className="p-1 text-muted-foreground/30 hover:text-foreground rounded-lg transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-1.5">
        {/* Loading */}
        {connected === null && (
          <div className="flex items-center gap-2 px-2.5 py-3 text-xs text-muted-foreground/50">
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking connection...
          </div>
        )}

        {/* Not connected */}
        {connected === false && (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full flex items-center gap-2.5 px-2.5 py-2.5 text-xs text-foreground hover:bg-muted/30 rounded-xl transition-colors"
          >
            {connecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
            )}
            <span>Connect {integrationName} to use this</span>
          </button>
        )}

        {/* Connected — show actions */}
        {connected === true && actions.length > 0 && (
          <div className="space-y-0.5">
            {actions.map((action: { slug: string; label: string }) => (
              <button
                key={action.slug}
                onClick={() => onAddAction(integrationId, action.slug, action.label)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-foreground hover:bg-muted/30 rounded-xl transition-colors group"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300" />
                <span className="flex-1 text-left">Add: {action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
