import { IS_PLATFORM } from "../constants/config";

// Utility function for authenticated API calls — uses httpOnly cookie (sent automatically)
export const authenticatedFetch = (url, options = {}) => {
  const defaultHeaders = {};

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  return fetch(url, {
    ...options,
    credentials: 'include', // sends httpOnly session cookie
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};

// API endpoints
export const api = {
  // Auth endpoints
  auth: {
    status: () => fetch('/api/auth/status', { credentials: 'include' }),
    login: (username, password) => fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    }),
    register: (firstName, lastName, password, email, phone) => fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, password, email, phone }),
      credentials: 'include',
    }),
    user: () => authenticatedFetch('/api/auth/user'),
    logout: () => authenticatedFetch('/api/auth/logout', { method: 'POST' }),
  },

  // Protected endpoints
  projects: () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    return authenticatedFetch('/api/projects', { signal: controller.signal })
      .finally(() => clearTimeout(timeoutId));
  },
  sessions: (projectName, limit = 5, offset = 0) =>
    authenticatedFetch(`/api/projects/${projectName}/sessions?limit=${limit}&offset=${offset}`),
  sessionMessages: (projectName, sessionId, limit = null, offset = 0, provider = 'claude') => {
    const params = new URLSearchParams();
    if (limit !== null) {
      params.append('limit', limit);
      params.append('offset', offset);
    }
    const queryString = params.toString();

    let url;
    if (provider === 'codex') {
      url = `/api/codex/sessions/${sessionId}/messages${queryString ? `?${queryString}` : ''}`;
    } else if (provider === 'cursor') {
      url = `/api/cursor/sessions/${sessionId}/messages${queryString ? `?${queryString}` : ''}`;
    } else {
      url = `/api/projects/${projectName}/sessions/${sessionId}/messages${queryString ? `?${queryString}` : ''}`;
    }
    return authenticatedFetch(url);
  },
  renameProject: (projectName, displayName) =>
    authenticatedFetch(`/api/projects/${projectName}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ displayName }),
    }),
  deleteSession: (projectName, sessionId) =>
    authenticatedFetch(`/api/projects/${projectName}/sessions/${sessionId}`, {
      method: 'DELETE',
    }),
  deleteCodexSession: (sessionId) =>
    authenticatedFetch(`/api/codex/sessions/${sessionId}`, {
      method: 'DELETE',
    }),
  deleteProject: (projectName, force = false) =>
    authenticatedFetch(`/api/projects/${projectName}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
    }),
  createProject: (path) =>
    authenticatedFetch('/api/projects/create', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),
  createWorkspace: (workspaceData) =>
    authenticatedFetch('/api/projects/create-workspace', {
      method: 'POST',
      body: JSON.stringify(workspaceData),
    }),
  readFile: (projectName, filePath) =>
    authenticatedFetch(`/api/projects/${projectName}/file?filePath=${encodeURIComponent(filePath)}`),
  saveFile: (projectName, filePath, content) =>
    authenticatedFetch(`/api/projects/${projectName}/file`, {
      method: 'PUT',
      body: JSON.stringify({ filePath, content }),
    }),
  getFiles: (projectName, options = {}) =>
    authenticatedFetch(`/api/projects/${projectName}/files`, options),
  transcribe: (formData) =>
    authenticatedFetch('/api/transcribe', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),

  // TaskMaster endpoints
  taskmaster: {
    init: (projectName) =>
      authenticatedFetch(`/api/taskmaster/init/${projectName}`, { method: 'POST' }),
    addTask: (projectName, { prompt, title, description, priority, dependencies }) =>
      authenticatedFetch(`/api/taskmaster/add-task/${projectName}`, {
        method: 'POST',
        body: JSON.stringify({ prompt, title, description, priority, dependencies }),
      }),
    parsePRD: (projectName, { fileName, numTasks, append }) =>
      authenticatedFetch(`/api/taskmaster/parse-prd/${projectName}`, {
        method: 'POST',
        body: JSON.stringify({ fileName, numTasks, append }),
      }),
    getTemplates: () => authenticatedFetch('/api/taskmaster/prd-templates'),
    applyTemplate: (projectName, { templateId, fileName, customizations }) =>
      authenticatedFetch(`/api/taskmaster/apply-template/${projectName}`, {
        method: 'POST',
        body: JSON.stringify({ templateId, fileName, customizations }),
      }),
    updateTask: (projectName, taskId, updates) =>
      authenticatedFetch(`/api/taskmaster/update-task/${projectName}/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
  },

  browseFilesystem: (dirPath = null) => {
    const params = new URLSearchParams();
    if (dirPath) params.append('path', dirPath);
    return authenticatedFetch(`/api/browse-filesystem?${params}`);
  },

  createFolder: (folderPath) =>
    authenticatedFetch('/api/create-folder', {
      method: 'POST',
      body: JSON.stringify({ path: folderPath }),
    }),

  // User endpoints
  user: {
    gitConfig: () => authenticatedFetch('/api/user/git-config'),
    updateGitConfig: (gitName, gitEmail) =>
      authenticatedFetch('/api/user/git-config', {
        method: 'POST',
        body: JSON.stringify({ gitName, gitEmail }),
      }),
    onboardingStatus: () => authenticatedFetch('/api/user/onboarding-status'),
    completeOnboarding: () =>
      authenticatedFetch('/api/user/complete-onboarding', { method: 'POST' }),
  },

  // Voice endpoints (STT + TTS)
  voice: {
    stt: (formData) => authenticatedFetch('/api/voice/stt', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),
    tts: (text, voice) => authenticatedFetch('/api/voice/tts', {
      method: 'POST',
      body: JSON.stringify({ text, voice }),
    }),
    voices: () => authenticatedFetch('/api/voice/voices'),
  },

  // Relay endpoints
  relay: {
    status: () => authenticatedFetch('/api/relay/status'),
    disconnect: () => authenticatedFetch('/api/relay/disconnect', { method: 'POST' }),
    createToken: (name) => authenticatedFetch('/api/relay/tokens', { method: 'POST', body: JSON.stringify({ name }) }),
    tokens: () => authenticatedFetch('/api/relay/tokens'),
    deleteToken: (id) => authenticatedFetch(`/api/relay/tokens/${id}`, { method: 'DELETE' }),
  },

  // Canvas endpoints — desktop: use localStorage instead of web API
  canvas: {
    load: (projectName) => {
      const key = `desktop-canvas-${projectName}`;
      const saved = localStorage.getItem(key);
      const data = saved ? JSON.parse(saved) : { blocks: [], viewport: null };
      return Promise.resolve(new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    },
    save: (projectName, elements, appState) => {
      const key = `desktop-canvas-${projectName}`;
      localStorage.setItem(key, JSON.stringify({ blocks: elements, viewport: appState }));
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    },
    clear: (projectName) => {
      const key = `desktop-canvas-${projectName}`;
      localStorage.removeItem(key);
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
    },
  },

  // Composio / Integrations
  composio: {
    status: () => authenticatedFetch('/api/composio/status'),
    catalog: () => authenticatedFetch('/api/composio/catalog'),
    connections: () => authenticatedFetch('/api/composio/connections'),
    connect: (appName, authConfigId) =>
      authenticatedFetch('/api/composio/connect', {
        method: 'POST',
        body: JSON.stringify({ appName, authConfigId }),
      }),
    waitForConnection: (connectedAccountId) =>
      authenticatedFetch('/api/composio/connect/wait', {
        method: 'POST',
        body: JSON.stringify({ connectedAccountId }),
      }),
    disconnect: (connectionId) =>
      authenticatedFetch(`/api/composio/connections/${connectionId}`, { method: 'DELETE' }),
    tools: (apps) =>
      authenticatedFetch(`/api/composio/tools?apps=${(apps || []).join(',')}`),
    toolSchema: (slug) =>
      authenticatedFetch(`/api/composio/tools/${slug}/schema`),
    executeTool: (slug, args) =>
      authenticatedFetch(`/api/composio/tools/${slug}/execute`, {
        method: 'POST',
        body: JSON.stringify({ arguments: args }),
      }),
  },

  // Browser endpoints
  browser: {
    status: () => authenticatedFetch('/api/browser/status'),
    createSession: () => authenticatedFetch('/api/browser/sessions', { method: 'POST' }),
    listSessions: () => authenticatedFetch('/api/browser/sessions'),
    getSession: (id) => authenticatedFetch(`/api/browser/sessions/${id}`),
    closeSession: (id) => authenticatedFetch(`/api/browser/sessions/${id}`, { method: 'DELETE' }),
    navigate: (id, url) =>
      authenticatedFetch(`/api/browser/sessions/${id}/navigate`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    sandboxPreview: (id, port) =>
      authenticatedFetch(`/api/browser/sessions/${id}/sandbox-preview`, {
        method: 'POST',
        body: JSON.stringify({ port }),
      }),
    screenshot: (id) =>
      authenticatedFetch(`/api/browser/sessions/${id}/screenshot`, { method: 'POST' }),
    aiAct: (id, instruction) =>
      authenticatedFetch(`/api/browser/sessions/${id}/ai/act`, {
        method: 'POST',
        body: JSON.stringify({ instruction }),
      }),
    aiExtract: (id, instruction, schema) =>
      authenticatedFetch(`/api/browser/sessions/${id}/ai/extract`, {
        method: 'POST',
        body: JSON.stringify({ instruction, schema }),
      }),
    aiObserve: (id, instruction) =>
      authenticatedFetch(`/api/browser/sessions/${id}/ai/observe`, {
        method: 'POST',
        body: JSON.stringify({ instruction }),
      }),
    consoleErrors: (id) => authenticatedFetch(`/api/browser/sessions/${id}/console-errors`),
  },

  // Generic GET method
  get: (endpoint) => authenticatedFetch(`/api${endpoint}`),
};
