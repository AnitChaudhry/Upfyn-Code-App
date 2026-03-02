import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Clock, Zap, MessageSquare, Phone, RefreshCw, ExternalLink, ArrowUpRight, Terminal, Layers, Rocket, BookOpen, Download } from 'lucide-react';
import { authenticatedFetch } from '../../utils/api';
import { IS_PLATFORM } from '../../constants/config';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useDeviceSettings } from '../../hooks/useDeviceSettings';
import { Skeleton } from '../ui/Skeleton';
import type { Project } from '../../types/app';

interface DashboardPanelProps {
  selectedProject: Project | null;
}

interface SessionStats {
  total: number;
  today: number;
  providers: Record<string, number>;
}

interface VapiStats {
  today: { calls: number; tokens: number };
  allTime: { calls: number; tokens: number };
  recentCalls: Array<{
    vapi_call_id: string;
    duration_seconds: number;
    tokens_used: number;
    status: string;
    summary?: string;
    created_at: string;
  }>;
  limit?: number;
  remaining?: number;
}

export default function DashboardPanel({ selectedProject }: DashboardPanelProps) {
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [vapiStats, setVapiStats] = useState<VapiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canPrompt: canInstallPwa, promptInstall } = usePwaInstall();
  const { isMobile } = useDeviceSettings({ trackPWA: false });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch session stats from main backend
      const sessionRes = await authenticatedFetch('/api/dashboard/stats');
      if (sessionRes.ok) {
        const data = await sessionRes.json();
        setSessionStats(data);
      }
    } catch (e) {
      // Session stats endpoint may not exist yet — that's OK
    }

    if (IS_PLATFORM) {
      try {
        // Fetch VAPI usage from the VAPI server
        const vapiRes = await authenticatedFetch('/api/vapi/usage');
        if (vapiRes.ok) {
          const data = await vapiRes.json();
          setVapiStats(data);
        }
      } catch (e) {
        // VAPI stats may not be available
      }
    }
    setLoading(false);
  }, []);

  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: fetchStats,
    enabled: isMobile,
  });

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div
      className="h-full overflow-y-auto p-4 sm:p-6 space-y-6"
      data-pull-refresh
      {...(isMobile ? pullHandlers : {})}
      style={pullDistance > 0 ? { transform: `translateY(${pullDistance * 0.3}px)` } : undefined}
    >
      {/* Pull-to-refresh indicator */}
      {isMobile && (pullDistance > 0 || isRefreshing) && (
        <div className="flex items-center justify-center py-2 -mt-2">
          {isRefreshing ? (
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 text-muted-foreground transition-transform"
              style={{ transform: `rotate(${Math.min((pullDistance / 80) * 180, 180)}deg)` }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {selectedProject ? `Project: ${selectedProject.displayName || selectedProject.name}` : 'Overview'}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh stats"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={MessageSquare}
          label="Sessions"
          value={sessionStats?.total ?? 0}
          subtext={sessionStats?.today ? `${sessionStats.today} today` : undefined}
          color="blue"
          loading={loading}
        />
        <StatCard
          icon={Zap}
          label="AI Providers"
          value={sessionStats?.providers ? Object.keys(sessionStats.providers).length : 0}
          subtext={sessionStats?.providers ? Object.keys(sessionStats.providers).join(', ') : undefined}
          color="purple"
          loading={loading}
        />
        {IS_PLATFORM && (
          <>
            <StatCard
              icon={Phone}
              label="Voice Calls"
              value={vapiStats?.allTime?.calls ?? 0}
              subtext={vapiStats?.today ? `${vapiStats.today.calls} today` : undefined}
              color="amber"
              loading={loading}
            />
            <StatCard
              icon={Clock}
              label="Call Limit"
              value={vapiStats?.remaining != null ? `${vapiStats.remaining} left` : 0}
              subtext={vapiStats?.limit ? `of ${vapiStats.limit}/day` : undefined}
              color="emerald"
              loading={loading}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <QuickAction
            label="Install CLI"
            description="npm install -g @upfynai-code/app"
            onClick={() => navigator.clipboard.writeText('npm install -g @upfynai-code/app')}
          />
          <QuickAction
            label="Connect Machine"
            description="uc connect"
            onClick={() => navigator.clipboard.writeText('uc connect')}
          />
          {IS_PLATFORM && (
            <QuickAction
              label="View Pricing"
              description="Upgrade your plan"
              href="https://cli.upfyn.com/pricing"
            />
          )}
          {canInstallPwa && (
            <QuickAction
              label="Install App"
              description="Add Upfyn to your home screen"
              onClick={promptInstall}
            />
          )}
        </div>
      </div>

      {/* Recent VAPI Calls (platform only) */}
      {IS_PLATFORM && vapiStats?.recentCalls && vapiStats.recentCalls.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Recent Voice Calls</h3>
          <div className="space-y-2">
            {vapiStats.recentCalls.slice(0, 5).map((call, i) => (
              <div key={call.vapi_call_id || i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3 min-w-0">
                  <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {call.summary || `Voice call — ${Math.round(call.duration_seconds || 0)}s`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {call.created_at ? new Date(call.created_at).toLocaleString() : 'Unknown time'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  call.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  call.status === 'ended' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {call.status || 'unknown'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Info */}
      {selectedProject && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Project Info</h3>
          <div className="rounded-lg bg-muted/30 border border-border/50 p-4 space-y-2">
            <InfoRow label="Name" value={selectedProject.displayName || selectedProject.name} />
            <InfoRow label="Path" value={selectedProject.fullPath || selectedProject.path || '—'} />
            {selectedProject.sessions && (
              <InfoRow label="Claude Sessions" value={String(selectedProject.sessions.length)} />
            )}
            {selectedProject.cursorSessions && (
              <InfoRow label="Cursor Sessions" value={String(selectedProject.cursorSessions.length)} />
            )}
            {selectedProject.codexSessions && (
              <InfoRow label="Codex Sessions" value={String(selectedProject.codexSessions.length)} />
            )}
          </div>
        </div>
      )}

      {/* Getting Started Guide */}
      {!selectedProject && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
            <Rocket className="w-3.5 h-3.5" />
            Getting Started
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/50 bg-card/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-foreground">1. Install the CLI</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Install globally, then run <code className="bg-muted px-1 rounded">uc</code> to launch.</p>
              <code className="text-xs bg-muted/50 px-2 py-1 rounded block text-foreground/80">npm install -g @upfynai-code/app</code>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-foreground">2. Connect Your Machine</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Bridge your local dev environment to this web UI.</p>
              <code className="text-xs bg-muted/50 px-2 py-1 rounded block text-foreground/80">uc connect --key your_relay_token</code>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-foreground">3. Use the Canvas</span>
              </div>
              <p className="text-xs text-muted-foreground">Switch to the Canvas tab to create visual workspaces with code blocks, diagrams, and notes.</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">4. Chat with AI</span>
              </div>
              <p className="text-xs text-muted-foreground">Use the Chat tab to talk to Claude, Cursor, or Codex. Bring your own API keys in Settings.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Subcomponents ---

function StatCard({ icon: Icon, label, value, subtext, color, loading }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color: 'blue' | 'purple' | 'amber' | 'emerald';
  loading?: boolean;
}) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-6 w-16 mb-1" />
          <Skeleton className="h-3 w-20" />
        </>
      ) : (
        <>
          <p className="text-xl font-semibold text-foreground">{value}</p>
          {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
        </>
      )}
    </div>
  );
}

function QuickAction({ label, description, onClick, href }: {
  label: string;
  description: string;
  onClick?: () => void;
  href?: string;
}) {
  const Tag = href ? 'a' : 'button';
  const props = href
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { onClick };

  return (
    <Tag
      {...(props as any)}
      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/60 transition-colors text-left group"
    >
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {href ? (
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
      ) : (
        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
      )}
    </Tag>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-mono text-xs truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}
