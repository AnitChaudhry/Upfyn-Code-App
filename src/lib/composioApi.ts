/**
 * Composio API Bridge for Desktop
 * Uses the stored JWT from auth to call the Railway backend's Composio endpoints.
 * This allows the desktop app to use the same Composio integrations as the web app.
 */
import { invoke } from '@tauri-apps/api/core';

const API_BASE = 'https://upfynai-code-production.up.railway.app';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComposioCatalogEntry {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
  connected: boolean;
  connectionId?: string;
  popularActions: { slug: string; label: string; params: string[] }[];
}

export interface ComposioConnection {
  id: string;
  appName: string;
  status: string;
}

export interface ComposioConnectResult {
  redirectUrl: string;
  connectedAccountId: string;
}

export interface ComposioWaitResult {
  status: string;
}

// ─── JWT Helper ─────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    const state = await invoke<{ token: string | null; is_authenticated: boolean }>('auth_get_stored');
    return state.is_authenticated ? state.token : null;
  } catch {
    return null;
  }
}

async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in first.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}

// ─── Composio API Methods ───────────────────────────────────────────────────

/**
 * Check if Composio is available on the backend
 */
export async function composioStatus(): Promise<{ available: boolean }> {
  try {
    const res = await authenticatedFetch('/api/composio/status');
    if (!res.ok) return { available: false };
    return await res.json();
  } catch {
    return { available: false };
  }
}

/**
 * Get integration catalog with user-specific connection status
 */
export async function composioCatalog(): Promise<ComposioCatalogEntry[]> {
  try {
    const res = await authenticatedFetch('/api/composio/catalog');
    if (!res.ok) return [];
    const data = await res.json();
    return data.catalog || [];
  } catch {
    return [];
  }
}

/**
 * List user's connected accounts
 */
export async function composioConnections(): Promise<ComposioConnection[]> {
  try {
    const res = await authenticatedFetch('/api/composio/connections');
    if (!res.ok) return [];
    const data = await res.json();
    return data.connections || [];
  } catch {
    return [];
  }
}

/**
 * Initiate OAuth connection for an app
 */
export async function composioConnect(appName: string, authConfigId?: string | null): Promise<ComposioConnectResult> {
  const res = await authenticatedFetch('/api/composio/connect', {
    method: 'POST',
    body: JSON.stringify({ appName, authConfigId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to initiate connection');
  }
  return await res.json();
}

/**
 * Poll for OAuth connection completion
 */
export async function composioWaitForConnection(connectedAccountId: string): Promise<ComposioWaitResult> {
  const res = await authenticatedFetch('/api/composio/connect/wait', {
    method: 'POST',
    body: JSON.stringify({ connectedAccountId }),
  });
  if (!res.ok) throw new Error('Failed to check connection status');
  return await res.json();
}

/**
 * Disconnect an integration
 */
export async function composioDisconnect(connectionId: string): Promise<void> {
  const res = await authenticatedFetch(`/api/composio/connections/${connectionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to disconnect');
}

/**
 * Execute a Composio tool action
 */
export async function composioExecuteTool(slug: string, args: Record<string, any>): Promise<any> {
  const res = await authenticatedFetch(`/api/composio/tools/${slug}/execute`, {
    method: 'POST',
    body: JSON.stringify({ arguments: args }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to execute tool');
  }
  return await res.json();
}
