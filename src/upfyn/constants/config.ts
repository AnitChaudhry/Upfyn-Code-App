// Runtime config injected by the server into index.html as window.__UPFYN_CONFIG__
// This allows the same pre-built frontend to work in both local and cloud modes
declare global {
  interface Window {
    __UPFYN_CONFIG__?: { isPlatform?: boolean; isLocal?: boolean };
  }
}

/**
 * Environment Flag: Is Platform
 * Checks runtime injection first (server-injected), then build-time env var (Vite/Vercel)
 */
export const IS_PLATFORM =
  window.__UPFYN_CONFIG__?.isPlatform === true ||
  import.meta.env.VITE_IS_PLATFORM === 'true';

/**
 * Environment Flag: Is Local
 * True when running as a standalone local server (no cloud, no relay)
 */
export const IS_LOCAL =
  window.__UPFYN_CONFIG__?.isLocal === true;

/**
 * Backend WebSocket URL (for split deployment: Vercel frontend + Railway backend)
 * In platform mode, WebSocket connects directly to Railway since Vercel can't proxy WS.
 * In self-hosted mode (same server), this is empty and WS uses window.location.host.
 */
export const WS_BACKEND_URL = import.meta.env.VITE_WS_URL || '';
