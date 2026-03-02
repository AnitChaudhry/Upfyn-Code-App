/**
 * Integration Catalog — shared between frontend (keyword matching) and backend (authConfigId lookup).
 * Maps keywords to Composio toolkit IDs with popular actions.
 */

const INTEGRATION_CATALOG = [
  {
    id: 'GMAIL',
    name: 'Gmail',
    icon: 'mail',
    keywords: ['gmail', 'email', 'send email', 'inbox', 'mail'],
    authConfigId: null,
    popularActions: [
      { slug: 'GMAIL_SEND_EMAIL', label: 'Send Email', params: ['to', 'subject', 'body'] },
      { slug: 'GMAIL_FETCH_EMAILS', label: 'Fetch Emails', params: ['query', 'max_results'] },
    ],
  },
  {
    id: 'GOOGLECALENDAR',
    name: 'Google Calendar',
    icon: 'calendar',
    keywords: ['calendar', 'event', 'meeting', 'schedule meeting'],
    authConfigId: null,
    popularActions: [
      { slug: 'GOOGLECALENDAR_CREATE_EVENT', label: 'Create Event', params: ['summary', 'start_time', 'end_time'] },
      { slug: 'GOOGLECALENDAR_LIST_EVENTS', label: 'List Events', params: ['time_min', 'time_max'] },
    ],
  },
  {
    id: 'SLACK',
    name: 'Slack',
    icon: 'hash',
    keywords: ['slack', 'channel', 'slack message'],
    authConfigId: null,
    popularActions: [
      { slug: 'SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL', label: 'Send Message', params: ['channel', 'text'] },
    ],
  },
  {
    id: 'GITHUB',
    name: 'GitHub',
    icon: 'github',
    keywords: ['github', 'repository', 'pull request', 'issue', 'commit'],
    authConfigId: null,
    popularActions: [
      { slug: 'GITHUB_CREATE_AN_ISSUE', label: 'Create Issue', params: ['owner', 'repo', 'title', 'body'] },
      { slug: 'GITHUB_CREATE_A_PULL_REQUEST', label: 'Create PR', params: ['owner', 'repo', 'title', 'head', 'base'] },
    ],
  },
  {
    id: 'NOTION',
    name: 'Notion',
    icon: 'file-text',
    keywords: ['notion', 'page', 'note'],
    authConfigId: null,
    popularActions: [
      { slug: 'NOTION_CREATE_A_PAGE', label: 'Create Page', params: ['parent_id', 'title', 'content'] },
    ],
  },
  {
    id: 'DISCORD',
    name: 'Discord',
    icon: 'message-circle',
    keywords: ['discord'],
    authConfigId: null,
    popularActions: [
      { slug: 'DISCORD_SEND_MESSAGE', label: 'Send Message', params: ['channel_id', 'content'] },
    ],
  },
  {
    id: 'GOOGLEDRIVE',
    name: 'Google Drive',
    icon: 'hard-drive',
    keywords: ['drive', 'google drive', 'upload file', 'file storage'],
    authConfigId: null,
    popularActions: [
      { slug: 'GOOGLEDRIVE_UPLOAD_FILE', label: 'Upload File', params: ['file_name', 'content'] },
      { slug: 'GOOGLEDRIVE_LIST_FILES', label: 'List Files', params: ['query'] },
    ],
  },
  {
    id: 'TRELLO',
    name: 'Trello',
    icon: 'layout-grid',
    keywords: ['trello', 'board', 'card', 'kanban'],
    authConfigId: null,
    popularActions: [
      { slug: 'TRELLO_CREATE_CARD', label: 'Create Card', params: ['list_id', 'name', 'desc'] },
    ],
  },
];

// Flattened keyword → integration ID map for fast O(1) lookup
const KEYWORD_MAP = {};
for (const integration of INTEGRATION_CATALOG) {
  for (const kw of integration.keywords) {
    KEYWORD_MAP[kw.toLowerCase()] = integration.id;
  }
}

// Integration ID → catalog entry for quick lookup
const CATALOG_BY_ID = {};
for (const integration of INTEGRATION_CATALOG) {
  CATALOG_BY_ID[integration.id] = integration;
}

export { INTEGRATION_CATALOG, KEYWORD_MAP, CATALOG_BY_ID };
