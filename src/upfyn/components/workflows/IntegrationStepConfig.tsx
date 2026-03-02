import { useState, useEffect } from 'react';
import { Plug, ExternalLink, Loader2, Check } from 'lucide-react';
import { INTEGRATION_CATALOG } from '../../../../shared/integrationCatalog.js';
import { api } from '../../utils/api';

interface IntegrationStepConfigProps {
  stepId: string;
  config: Record<string, any>;
  onUpdateConfig: (key: string, value: any) => void;
}

interface CatalogEntry {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  connectionId: string | null;
  popularActions: Array<{ slug: string; label: string; params: string[] }>;
}

export default function IntegrationStepConfig({ stepId, config, onUpdateConfig }: IntegrationStepConfigProps) {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [composioAvailable, setComposioAvailable] = useState(false);

  useEffect(() => {
    api.composio.catalog().then(r => r.json()).then(data => {
      setCatalog(data.catalog || []);
      setComposioAvailable(data.composioAvailable);
      setLoading(false);
    }).catch(() => {
      setCatalog(INTEGRATION_CATALOG.map((i: any) => ({ ...i, connected: false, connectionId: null })));
      setLoading(false);
    });
  }, []);

  const selectedIntegration = catalog.find(c => c.id === config.integrationId);
  const selectedAction = selectedIntegration?.popularActions.find(a => a.slug === config.toolSlug);

  const handleConnect = async (appName: string) => {
    setConnecting(true);
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
              const catRes = await api.composio.catalog();
              const catData = await catRes.json();
              setCatalog(catData.catalog || []);
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground/50 py-3">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading integrations...
      </div>
    );
  }

  if (!composioAvailable) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground/50 py-3">
        <Plug className="w-3.5 h-3.5" />
        <span>Composio not configured. Set <code className="px-1 py-0.5 bg-muted/40 rounded text-[10px] font-mono">COMPOSIO_API_KEY</code> on the server.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Integration selector */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Integration</label>
        <select
          value={config.integrationId || ''}
          onChange={e => {
            const id = e.target.value;
            onUpdateConfig('integrationId', id);
            onUpdateConfig('toolSlug', '');
            onUpdateConfig('arguments', {});
          }}
          className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground focus:outline-none focus:border-primary/40 transition-colors"
        >
          <option value="">Select an integration...</option>
          {catalog.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} {c.connected ? '(Connected)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Connection status */}
      {selectedIntegration && !selectedIntegration.connected && (
        <div className="flex items-center gap-2 p-2.5 bg-yellow-500/[0.03] border border-yellow-500/15 rounded-xl">
          <span className="text-[10px] text-yellow-400 flex-1">
            {selectedIntegration.name} is not connected yet.
          </span>
          <button
            onClick={() => handleConnect(selectedIntegration.id)}
            disabled={connecting}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
            Connect
          </button>
        </div>
      )}

      {selectedIntegration && selectedIntegration.connected && (
        <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-medium">
          <Check className="w-3 h-3" />
          Connected
        </div>
      )}

      {/* Action selector */}
      {selectedIntegration && (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground/60 mb-1 block">Action</label>
          <select
            value={config.toolSlug || ''}
            onChange={e => {
              onUpdateConfig('toolSlug', e.target.value);
              onUpdateConfig('arguments', {});
            }}
            className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground focus:outline-none focus:border-primary/40 transition-colors"
          >
            <option value="">Select an action...</option>
            {selectedIntegration.popularActions.map(a => (
              <option key={a.slug} value={a.slug}>{a.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Parameters */}
      {selectedAction && selectedAction.params.length > 0 && (
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-muted-foreground/60 block">Parameters</label>
          {selectedAction.params.map(param => (
            <div key={param}>
              <label className="text-[10px] text-muted-foreground/40 mb-0.5 block capitalize">{param.replace(/_/g, ' ')}</label>
              <input
                value={config.arguments?.[param] || ''}
                onChange={e => {
                  const args = { ...(config.arguments || {}), [param]: e.target.value };
                  onUpdateConfig('arguments', args);
                }}
                placeholder={`{{prev.${param}}} or value`}
                className="w-full px-3 py-2 text-xs bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground/25 focus:outline-none focus:border-primary/40 font-mono transition-colors"
              />
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground/30">
            Use {'{{prev.field}}'} to reference output from the previous step.
          </p>
        </div>
      )}
    </div>
  );
}
