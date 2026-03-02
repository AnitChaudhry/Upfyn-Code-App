import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../../../../utils/api';
import type { Project } from '../../../../types/app';

type McpServer = {
  id: string;
  name: string;
  type: string;
  scope: string;
  projectPath?: string;
  config: Record<string, unknown>;
};

type ProjectSettingsDrawerProps = {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
};

export default function ProjectSettingsDrawer({ project, isOpen, onClose }: ProjectSettingsDrawerProps) {
  const { t } = useTranslation('sidebar');
  const [claudeMd, setClaudeMd] = useState<string | null>(null);
  const [claudeMdPath, setClaudeMdPath] = useState<string | null>(null);
  const [claudeMdLoading, setClaudeMdLoading] = useState(false);
  const [claudeMdError, setClaudeMdError] = useState<string | null>(null);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);

  const fetchClaudeMd = useCallback(async () => {
    setClaudeMdLoading(true);
    setClaudeMdError(null);
    try {
      const res = await authenticatedFetch(`/api/projects/${encodeURIComponent(project.name)}/claude-md`);
      const data = await res.json();
      setClaudeMd(data.content);
      setClaudeMdPath(data.path || null);
      if (data.error) setClaudeMdError(data.error);
    } catch {
      setClaudeMdError('Failed to fetch CLAUDE.md');
    } finally {
      setClaudeMdLoading(false);
    }
  }, [project.name]);

  const fetchMcpServers = useCallback(async () => {
    setMcpLoading(true);
    try {
      const projectPath = project.fullPath || project.path || '';
      const res = await authenticatedFetch(`/api/mcp/config/read?projectPath=${encodeURIComponent(projectPath)}`);
      const data = await res.json();
      if (data.success && data.servers) {
        setMcpServers(data.servers.filter((s: McpServer) => s.scope === 'project' || s.scope === 'local'));
      } else {
        setMcpServers([]);
      }
    } catch {
      setMcpServers([]);
    } finally {
      setMcpLoading(false);
    }
  }, [project.fullPath, project.path]);

  useEffect(() => {
    if (isOpen) {
      void fetchClaudeMd();
      void fetchMcpServers();
    }
  }, [isOpen, fetchClaudeMd, fetchMcpServers]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="relative ml-auto w-full sm:max-w-md bg-card border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground truncate">{project.displayName}</h2>
            <p className="text-xs text-muted-foreground truncate" title={project.fullPath}>{project.fullPath}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 w-10 h-10 sm:w-7 sm:h-7 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Quick info */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('projectSettings.quickInfo', { defaultValue: 'Quick Info' })}
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="truncate">{project.fullPath}</span>
              </div>
              {project.taskmaster?.hasTaskmaster && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>TaskMaster: <span className="text-green-600 dark:text-green-400">Active</span></span>
                </div>
              )}
            </div>
          </section>

          {/* CLAUDE.md */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              CLAUDE.md
            </h3>
            {claudeMdLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </div>
            ) : claudeMdError ? (
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                {claudeMdError}
              </div>
            ) : claudeMd ? (
              <div className="bg-muted/50 rounded-lg border border-border/50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/30">
                  <span className="text-xs text-muted-foreground font-mono truncate">{claudeMdPath}</span>
                </div>
                <pre className="px-3 py-2 text-xs text-foreground overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {claudeMd}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-3 border border-border/30">
                {t('projectSettings.noClaudeMd', { defaultValue: 'No CLAUDE.md found in this project.' })}
              </div>
            )}
          </section>

          {/* Project MCP Servers */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('projectSettings.mcpServers', { defaultValue: 'Project MCP Servers' })}
            </h3>
            {mcpLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </div>
            ) : mcpServers.length > 0 ? (
              <div className="space-y-2">
                {mcpServers.map((server) => (
                  <div key={server.id} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/30">
                    <svg className="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground">{server.name}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      server.type === 'stdio'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    }`}>
                      {server.type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-3 border border-border/30">
                {t('projectSettings.noMcpServers', { defaultValue: 'No project-scoped MCP servers configured.' })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
