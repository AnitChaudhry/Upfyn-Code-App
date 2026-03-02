/**
 * Desktop Tool & Integration Catalog
 *
 * Two layers:
 * 1. LOCAL dev tools — always available (git, npm, docker, etc.)
 * 2. COMPOSIO integrations — same catalog as the web app (Gmail, Slack, GitHub, etc.)
 *    Connection status checked via Railway backend API.
 *
 * Keyword awakening behavior:
 * - Composio integrations: popup shows ONLY for NOT-connected integrations (nudge to connect)
 * - Dev tools: popup always shows suggestions
 */

// ─── Dev Tool Catalog (Local) ───────────────────────────────────────────────

export interface SuggestedStep {
  label: string;
  type: 'shell' | 'ai-prompt' | 'webhook' | 'file-op';
  command: string;
}

export interface DevToolEntry {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
  description: string;
  suggestedSteps: SuggestedStep[];
  isLocal: true;
}

export const DEV_TOOL_CATALOG: DevToolEntry[] = [
  {
    id: 'git', name: 'Git', icon: 'git-branch', isLocal: true,
    keywords: ['git', 'commit', 'push', 'pull', 'branch', 'merge', 'rebase', 'stash'],
    description: 'Version control operations',
    suggestedSteps: [
      { label: 'Git Add & Commit', type: 'shell', command: 'git add -A && git commit -m "auto-commit"' },
      { label: 'Git Push', type: 'shell', command: 'git push origin HEAD' },
      { label: 'Git Pull', type: 'shell', command: 'git pull origin main' },
      { label: 'Git Status', type: 'shell', command: 'git status' },
    ],
  },
  {
    id: 'npm', name: 'NPM / Node.js', icon: 'package', isLocal: true,
    keywords: ['npm', 'node', 'yarn', 'pnpm', 'install', 'package', 'dependencies'],
    description: 'Node.js package management & scripts',
    suggestedSteps: [
      { label: 'Install Dependencies', type: 'shell', command: 'npm install' },
      { label: 'Run Build', type: 'shell', command: 'npm run build' },
      { label: 'Run Dev Server', type: 'shell', command: 'npm run dev' },
    ],
  },
  {
    id: 'test', name: 'Testing', icon: 'flask-conical', isLocal: true,
    keywords: ['test', 'jest', 'vitest', 'mocha', 'pytest', 'cypress', 'playwright', 'unit test'],
    description: 'Run project tests',
    suggestedSteps: [
      { label: 'Run Tests', type: 'shell', command: 'npm test' },
      { label: 'Run Tests (Watch)', type: 'shell', command: 'npm test -- --watch' },
      { label: 'Run Coverage', type: 'shell', command: 'npm test -- --coverage' },
    ],
  },
  {
    id: 'lint', name: 'Linting & Formatting', icon: 'check-circle', isLocal: true,
    keywords: ['lint', 'eslint', 'prettier', 'format', 'biome'],
    description: 'Code linting and formatting',
    suggestedSteps: [
      { label: 'Lint Code', type: 'shell', command: 'npm run lint' },
      { label: 'Fix Lint Issues', type: 'shell', command: 'npm run lint -- --fix' },
      { label: 'Format Code', type: 'shell', command: 'npx prettier --write .' },
    ],
  },
  {
    id: 'docker', name: 'Docker', icon: 'container', isLocal: true,
    keywords: ['docker', 'container', 'compose', 'dockerfile'],
    description: 'Docker container operations',
    suggestedSteps: [
      { label: 'Docker Build', type: 'shell', command: 'docker build -t myapp .' },
      { label: 'Docker Compose Up', type: 'shell', command: 'docker compose up -d' },
      { label: 'Docker Compose Down', type: 'shell', command: 'docker compose down' },
    ],
  },
  {
    id: 'deploy', name: 'Deployment', icon: 'rocket', isLocal: true,
    keywords: ['deploy', 'vercel', 'netlify', 'railway', 'production', 'staging'],
    description: 'Deploy to hosting platforms',
    suggestedSteps: [
      { label: 'Deploy to Vercel', type: 'shell', command: 'npx vercel --prod' },
      { label: 'Build & Deploy', type: 'shell', command: 'npm run build && npx vercel --prod' },
    ],
  },
  {
    id: 'database', name: 'Database', icon: 'database', isLocal: true,
    keywords: ['database', 'db', 'sql', 'migrate', 'seed', 'prisma', 'drizzle'],
    description: 'Database operations',
    suggestedSteps: [
      { label: 'Run Migrations', type: 'shell', command: 'npx prisma migrate dev' },
      { label: 'Generate Client', type: 'shell', command: 'npx prisma generate' },
      { label: 'Seed Database', type: 'shell', command: 'npm run db:seed' },
    ],
  },
  {
    id: 'clean', name: 'Cleanup', icon: 'trash-2', isLocal: true,
    keywords: ['clean', 'cleanup', 'clear', 'cache', 'prune'],
    description: 'Clean build artifacts and caches',
    suggestedSteps: [
      { label: 'Clean Build', type: 'shell', command: 'rm -rf dist build .next .cache' },
      { label: 'Clean & Reinstall', type: 'shell', command: 'rm -rf node_modules && npm install' },
    ],
  },
  {
    id: 'ai-review', name: 'AI Code Review', icon: 'sparkles', isLocal: true,
    keywords: ['review', 'code review', 'analyze', 'audit', 'refactor', 'ai'],
    description: 'AI-powered code analysis',
    suggestedSteps: [
      { label: 'AI: Review Changes', type: 'ai-prompt', command: 'Review the recent code changes for bugs and improvements' },
      { label: 'AI: Write Docs', type: 'ai-prompt', command: 'Generate documentation for the main functions' },
    ],
  },
];

// ─── Composio Integration Catalog (Cloud) ───────────────────────────────────
// Matches the web app's integrationCatalog.js exactly

export interface ComposioIntegrationEntry {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
  authConfigId: string | null;
  popularActions: { slug: string; label: string; params: string[] }[];
  isLocal: false;
}

export const COMPOSIO_CATALOG: ComposioIntegrationEntry[] = [
  {
    id: 'GMAIL', name: 'Gmail', icon: 'mail', isLocal: false,
    keywords: ['gmail', 'email', 'send email', 'inbox', 'mail'],
    authConfigId: null,
    popularActions: [
      { slug: 'GMAIL_SEND_EMAIL', label: 'Send Email', params: ['to', 'subject', 'body'] },
      { slug: 'GMAIL_FETCH_EMAILS', label: 'Fetch Emails', params: ['query', 'max_results'] },
    ],
  },
  {
    id: 'GOOGLECALENDAR', name: 'Google Calendar', icon: 'calendar', isLocal: false,
    keywords: ['calendar', 'event', 'meeting', 'schedule meeting'],
    authConfigId: null,
    popularActions: [
      { slug: 'GOOGLECALENDAR_CREATE_EVENT', label: 'Create Event', params: ['summary', 'start_time', 'end_time'] },
      { slug: 'GOOGLECALENDAR_LIST_EVENTS', label: 'List Events', params: ['time_min', 'time_max'] },
    ],
  },
  {
    id: 'SLACK', name: 'Slack', icon: 'hash', isLocal: false,
    keywords: ['slack', 'channel', 'slack message'],
    authConfigId: null,
    popularActions: [
      { slug: 'SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL', label: 'Send Message', params: ['channel', 'text'] },
    ],
  },
  {
    id: 'GITHUB', name: 'GitHub', icon: 'github', isLocal: false,
    keywords: ['github', 'repository', 'pull request', 'issue'],
    authConfigId: null,
    popularActions: [
      { slug: 'GITHUB_CREATE_AN_ISSUE', label: 'Create Issue', params: ['owner', 'repo', 'title', 'body'] },
      { slug: 'GITHUB_CREATE_A_PULL_REQUEST', label: 'Create PR', params: ['owner', 'repo', 'title', 'head', 'base'] },
    ],
  },
  {
    id: 'NOTION', name: 'Notion', icon: 'file-text', isLocal: false,
    keywords: ['notion', 'page', 'note'],
    authConfigId: null,
    popularActions: [
      { slug: 'NOTION_CREATE_A_PAGE', label: 'Create Page', params: ['parent_id', 'title', 'content'] },
    ],
  },
  {
    id: 'DISCORD', name: 'Discord', icon: 'message-circle', isLocal: false,
    keywords: ['discord'],
    authConfigId: null,
    popularActions: [
      { slug: 'DISCORD_SEND_MESSAGE', label: 'Send Message', params: ['channel_id', 'content'] },
    ],
  },
  {
    id: 'GOOGLEDRIVE', name: 'Google Drive', icon: 'hard-drive', isLocal: false,
    keywords: ['drive', 'google drive', 'upload file', 'file storage'],
    authConfigId: null,
    popularActions: [
      { slug: 'GOOGLEDRIVE_UPLOAD_FILE', label: 'Upload File', params: ['file_name', 'content'] },
      { slug: 'GOOGLEDRIVE_LIST_FILES', label: 'List Files', params: ['query'] },
    ],
  },
  {
    id: 'TRELLO', name: 'Trello', icon: 'kanban', isLocal: false,
    keywords: ['trello', 'board', 'card', 'kanban'],
    authConfigId: null,
    popularActions: [
      { slug: 'TRELLO_CREATE_CARD', label: 'Create Card', params: ['list_id', 'name', 'desc'] },
    ],
  },
  {
    id: 'LINEAR', name: 'Linear', icon: 'bug', isLocal: false,
    keywords: ['linear', 'ticket', 'linear issue'],
    authConfigId: null,
    popularActions: [
      { slug: 'LINEAR_CREATE_ISSUE', label: 'Create Issue', params: ['team_id', 'title', 'description'] },
    ],
  },
  {
    id: 'JIRA', name: 'Jira', icon: 'bug', isLocal: false,
    keywords: ['jira', 'sprint', 'jira issue', 'jira ticket'],
    authConfigId: null,
    popularActions: [
      { slug: 'JIRA_CREATE_ISSUE', label: 'Create Issue', params: ['project_key', 'summary', 'description', 'issue_type'] },
    ],
  },
  {
    id: 'ASANA', name: 'Asana', icon: 'list-checks', isLocal: false,
    keywords: ['asana', 'task', 'asana task', 'project management'],
    authConfigId: null,
    popularActions: [
      { slug: 'ASANA_CREATE_TASK', label: 'Create Task', params: ['project_id', 'name', 'notes'] },
    ],
  },
  {
    id: 'STRIPE', name: 'Stripe', icon: 'credit-card', isLocal: false,
    keywords: ['stripe', 'payment', 'invoice', 'charge', 'billing'],
    authConfigId: null,
    popularActions: [
      { slug: 'STRIPE_CREATE_INVOICE', label: 'Create Invoice', params: ['customer_id', 'amount', 'currency'] },
    ],
  },
  {
    id: 'TWILIO', name: 'Twilio', icon: 'phone', isLocal: false,
    keywords: ['twilio', 'sms', 'text message', 'phone'],
    authConfigId: null,
    popularActions: [
      { slug: 'TWILIO_SEND_SMS', label: 'Send SMS', params: ['to', 'body'] },
    ],
  },
  {
    id: 'AIRTABLE', name: 'Airtable', icon: 'table', isLocal: false,
    keywords: ['airtable', 'spreadsheet', 'airtable record'],
    authConfigId: null,
    popularActions: [
      { slug: 'AIRTABLE_CREATE_RECORD', label: 'Create Record', params: ['base_id', 'table_name', 'fields'] },
    ],
  },
];

// ─── Unified Types ──────────────────────────────────────────────────────────

export type CatalogEntry = DevToolEntry | ComposioIntegrationEntry;

// ─── Keyword Maps ───────────────────────────────────────────────────────────

// Dev tool keyword → tool ID (always available)
export const DEV_KEYWORD_MAP: Record<string, string> = {};
for (const tool of DEV_TOOL_CATALOG) {
  for (const kw of tool.keywords) {
    DEV_KEYWORD_MAP[kw.toLowerCase()] = tool.id;
  }
}

// Composio integration keyword → integration ID (context-aware)
export const COMPOSIO_KEYWORD_MAP: Record<string, string> = {};
for (const integration of COMPOSIO_CATALOG) {
  for (const kw of integration.keywords) {
    COMPOSIO_KEYWORD_MAP[kw.toLowerCase()] = integration.id;
  }
}

// Combined keyword map for detection
export const KEYWORD_MAP: Record<string, string> = {
  ...DEV_KEYWORD_MAP,
  ...COMPOSIO_KEYWORD_MAP,
};

// Lookup maps
export const DEV_CATALOG_BY_ID: Record<string, DevToolEntry> = {};
for (const tool of DEV_TOOL_CATALOG) {
  DEV_CATALOG_BY_ID[tool.id] = tool;
}

export const COMPOSIO_CATALOG_BY_ID: Record<string, ComposioIntegrationEntry> = {};
for (const integration of COMPOSIO_CATALOG) {
  COMPOSIO_CATALOG_BY_ID[integration.id] = integration;
}

// Combined lookup
export const CATALOG_BY_ID: Record<string, CatalogEntry> = {
  ...DEV_CATALOG_BY_ID,
  ...COMPOSIO_CATALOG_BY_ID,
};
