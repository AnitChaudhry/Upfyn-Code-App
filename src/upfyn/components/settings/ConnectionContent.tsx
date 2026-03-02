import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Copy, Check, RefreshCw, Monitor, MapPin, Terminal, Power } from 'lucide-react';
import { useRelay } from '../../contexts/RelayContext';
import { authenticatedFetch } from '../../utils/api';

export default function ConnectionContent() {
  const {
    isRelayConnected, relayCwd, relayMachine, relayPlatform,
    relayAgents, sandboxActive, isDisconnecting, disconnect,
  } = useRelay();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const fetchToken = useCallback(async () => {
    try {
      const res = await authenticatedFetch('/api/auth/connect-token');
      if (res.ok) {
        const data = await res.json();
        setToken(data.token || null);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchToken(); }, [fetchToken]);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      const res = await authenticatedFetch('/api/auth/regenerate-token', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token || null);
      }
    } catch { /* ignore */ }
    setRegenerating(false);
  }, []);

  const handleDisconnect = useCallback(async () => {
    const success = await disconnect();
    if (success) setShowConfirm(false);
  }, [disconnect]);

  const connectCommand = token ? `uc connect --key ${token}` : 'uc connect';

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className={`rounded-lg border p-4 ${
        isRelayConnected
          ? 'bg-green-500/5 border-green-500/20'
          : 'bg-amber-500/5 border-amber-500/20'
      }`}>
        <div className="flex items-center gap-3">
          {isRelayConnected ? (
            <Wifi className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="font-medium text-foreground">
              {isRelayConnected ? 'Machine Connected' : 'Machine Not Connected'}
            </div>
            <div className="text-sm text-muted-foreground">
              {isRelayConnected
                ? 'Your local machine is connected and ready to execute commands.'
                : 'Connect your machine to enable chat, terminal, files, and git.'}
            </div>
          </div>
          {isRelayConnected && (
            showConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400">Disconnect?</span>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-40"
                >
                  {isDisconnecting ? '...' : 'Yes'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="text-xs px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                className="p-2 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                title="Disconnect machine"
              >
                <Power className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Machine Info (when connected) */}
      {isRelayConnected && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <h4 className="text-sm font-medium text-foreground">Machine Info</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {relayMachine && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Monitor className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{relayMachine}</span>
              </div>
            )}
            {relayPlatform && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Terminal className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{relayPlatform}</span>
              </div>
            )}
            {relayCwd && (
              <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate font-mono text-xs">{relayCwd}</span>
              </div>
            )}
          </div>
          {relayAgents && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Agents: {Object.entries(relayAgents as Record<string, { installed: boolean; label: string }>)
                  .filter(([, info]) => info.installed)
                  .map(([, info]) => info.label)
                  .join(', ') || 'None detected'}
              </div>
            </div>
          )}
          {sandboxActive && (
            <div className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 w-fit">
              Sandbox Active
            </div>
          )}
        </div>
      )}

      {/* Relay Token */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">Relay Token</h4>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>

        {loading ? (
          <div className="h-10 bg-muted/50 rounded animate-pulse" />
        ) : token ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-background/50 border border-border rounded-md px-3 py-2 truncate select-all">
              {token}
            </code>
            <button
              onClick={() => handleCopy(token, 'token')}
              className="flex-shrink-0 p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Copy token"
            >
              {copied === 'token' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load token.</p>
        )}
      </div>

      {/* Quick Connect Command */}
      {!isRelayConnected && token && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h4 className="text-sm font-medium text-foreground">Quick Connect</h4>
          <p className="text-xs text-muted-foreground">Run this command on your local machine:</p>
          <div className="flex items-center gap-2 bg-background/50 border border-border rounded-md px-3 py-2">
            <code className="flex-1 text-xs font-mono truncate select-all">{connectCommand}</code>
            <button
              onClick={() => handleCopy(connectCommand, 'command')}
              className="flex-shrink-0 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Copy command"
            >
              {copied === 'command' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Setup Instructions (collapsible) */}
      {!isRelayConnected && (
        <div className="rounded-lg border border-border">
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="w-full flex items-center justify-between p-4 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
          >
            <span>First-time setup instructions</span>
            <span className={`text-muted-foreground transition-transform ${showSetup ? 'rotate-180' : ''}`}>
              &#9662;
            </span>
          </button>
          {showSetup && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              <div className="space-y-2">
                <Step number={1} text="Install the CLI globally:" />
                <CodeBlock text="npm install -g @upfynai-code/app" onCopy={handleCopy} copied={copied} label="step1" />
                <Step number={2} text="Login to your account:" />
                <CodeBlock text="uc login" onCopy={handleCopy} copied={copied} label="step2" />
                <Step number={3} text="Connect your machine:" />
                <CodeBlock text={connectCommand} onCopy={handleCopy} copied={copied} label="step3" />
              </div>
              <p className="text-xs text-muted-foreground">
                Once connected, all workspace features (chat, terminal, files, git) will become active.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[10px] font-medium mr-1.5">
        {number}
      </span>
      {text}
    </p>
  );
}

function CodeBlock({ text, onCopy, copied, label }: { text: string; onCopy: (t: string, l: string) => void; copied: string | null; label: string }) {
  return (
    <div className="flex items-center gap-2 bg-background/50 rounded-md border border-border px-3 py-2">
      <code className="text-xs text-foreground flex-1 font-mono">{text}</code>
      <button
        onClick={() => onCopy(text, label)}
        className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        {copied === label ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}
