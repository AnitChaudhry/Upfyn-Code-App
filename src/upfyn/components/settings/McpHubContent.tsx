import { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '../../utils/api';

type McpServerConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
};

type McpServer = {
  id: string;
  name: string;
  type: string;
  scope: string;
  projectPath?: string;
  config: McpServerConfig;
  raw?: Record<string, unknown>;
};

type DirectoryEntry = {
  name: string;
  description: string;
  category: string;
  installConfig: { type: string; command: string; args: string[] };
};

const MCP_DIRECTORY: DirectoryEntry[] = [
  { name: 'filesystem', description: 'Read/write local files and directories', category: 'Files & Code',
    installConfig: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/path'] } },
  { name: 'github', description: 'GitHub repos, issues, and PRs', category: 'Data & APIs',
    installConfig: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] } },
  { name: 'postgres', description: 'Query PostgreSQL databases', category: 'Data & APIs',
    installConfig: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres'] } },
  { name: 'brave-search', description: 'Web search via Brave Search API', category: 'AI & Search',
    installConfig: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'] } },
  { name: 'memory', description: 'Persistent memory store for AI agents', category: 'AI & Search',
    installConfig: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'] } },
  { name: 'puppeteer', description: 'Browser automation and scraping', category: 'DevOps',
    installConfig: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer'] } },
  { name: 'sqlite', description: 'Query SQLite databases', category: 'Data & APIs',
    installConfig: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sqlite'] } },
  { name: 'fetch', description: 'HTTP fetch and web content retrieval', category: 'Data & APIs',
    installConfig: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch'] } },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Files & Code': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  'Data & APIs': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'AI & Search': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'DevOps': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
};

export default function McpHubContent() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [upfynUrl, setUpfynUrl] = useState('');

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/mcp/config/read');
      const data = await res.json();
      if (data.success && data.servers) {
        setServers(data.servers);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchServers();
    // Compute Upfyn MCP URL
    const origin = window.location.origin;
    setUpfynUrl(`${origin}/mcp`);
  }, [fetchServers]);

  const handleInstall = async (entry: DirectoryEntry) => {
    setInstalling(entry.name);
    try {
      const res = await authenticatedFetch('/api/mcp/cli/add-json', {
        method: 'POST',
        body: JSON.stringify({
          name: entry.name,
          config: {
            command: entry.installConfig.command,
            args: entry.installConfig.args,
          },
        }),
      });
      if (res.ok) {
        await fetchServers();
      }
    } catch { /* ignore */ }
    setInstalling(null);
  };

  const isInstalled = (name: string) => servers.some((s) => s.name === name);

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Installed Servers */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Installed Servers</h3>
          <button
            onClick={() => void fetchServers()}
            className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading servers...
          </div>
        ) : servers.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-4 border border-border/30">
            No MCP servers installed. Browse the directory below to get started.
          </div>
        ) : (
          <div className="grid gap-2">
            {servers.map((server) => (
              <div key={server.id} className="flex items-center gap-3 px-4 py-3 bg-card border border-border/50 rounded-lg">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground">{server.name}</span>
                  {server.type === 'stdio' && server.config?.command && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {server.config.command}{' '}
                      {server.config.args ? server.config.args.join(' ') : ''}
                    </p>
                  )}
                  {(server.type === 'http' || server.type === 'sse') && server.config?.url && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {server.config.url}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  server.type === 'stdio'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : server.type === 'sse'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                }`}>
                  {server.type}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  server.scope === 'user'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                }`}>
                  {server.scope}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Server Directory */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Server Directory</h3>
          <span className="text-xs text-muted-foreground">Popular MCP servers</span>
        </div>

        <div className="grid gap-2">
          {MCP_DIRECTORY.map((entry) => {
            const installed = isInstalled(entry.name);
            return (
              <div key={entry.name} className="flex items-center gap-3 px-4 py-3 bg-muted/20 border border-border/30 rounded-lg">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{entry.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[entry.category] || 'bg-gray-100 text-gray-600'}`}>
                      {entry.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                </div>
                {installed ? (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Installed
                  </span>
                ) : (
                  <button
                    onClick={() => void handleInstall(entry)}
                    disabled={installing === entry.name}
                    className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium transition-colors flex-shrink-0 min-h-[36px]"
                  >
                    {installing === entry.name ? 'Installing...' : 'Install'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3: Your Upfyn MCP Server */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Your Upfyn MCP Server</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Connect external AI clients (Claude Desktop, Cursor, etc.) to your Upfyn instance using MCP.
        </p>

        <div className="bg-muted/30 border border-border/30 rounded-lg p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">MCP Endpoint</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-sm bg-card border border-border rounded px-3 py-1.5 font-mono text-foreground truncate">
                {upfynUrl}
              </code>
              <button
                onClick={() => copyToClipboard(upfynUrl)}
                className="px-2.5 py-1.5 rounded-md border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Copy"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Claude Desktop Config</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-xs bg-card border border-border rounded px-3 py-1.5 font-mono text-foreground overflow-x-auto">
                {`{ "mcpServers": { "upfyn": { "url": "${upfynUrl}" } } }`}
              </code>
              <button
                onClick={() => copyToClipboard(`{ "mcpServers": { "upfyn": { "url": "${upfynUrl}" } } }`)}
                className="px-2.5 py-1.5 rounded-md border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Copy config"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
