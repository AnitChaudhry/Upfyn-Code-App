import { useState, useEffect, useCallback } from 'react';
import { IS_PLATFORM } from '../constants/config';
import { ReleaseInfo } from '../types/sharedTypes';

// Version is read from the backend package.json at build time via Vite's define
const version: string = __APP_VERSION__;

const DISMISS_KEY = 'upfyn-version-dismissed';

/**
 * Compare two semantic version strings
 */
const compareVersions = (v1: string, v2: string) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) return p1 - p2;
  }
  return 0;
};

export const useVersionCheck = (owner: string, repo: string) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    // On platform mode (cli.upfyn.com), the server is auto-deployed via Railway.
    // Users don't need to update anything — skip version check entirely.
    if (IS_PLATFORM) return;

    const checkVersion = async () => {
      try {
        // Check the main package (upfynai-code) for available updates
        const response = await fetch('https://registry.npmjs.org/upfynai-code/latest');
        if (!response.ok) return;
        const data = await response.json();

        if (data.version) {
          const latest = data.version;
          setLatestVersion(latest);

          // Check if user dismissed this specific version
          const dismissed = localStorage.getItem(DISMISS_KEY);
          if (dismissed === latest) {
            setUpdateAvailable(false);
            return;
          }

          setUpdateAvailable(compareVersions(latest, version) > 0);

          setReleaseInfo({
            title: `v${latest}`,
            body: '',
            htmlUrl: `https://www.npmjs.com/package/upfynai-code`,
            publishedAt: null
          });
        }
      } catch {
        // Silently fail — version check is non-critical
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [owner, repo]);

  const dismissUpdate = useCallback(() => {
    if (latestVersion) {
      localStorage.setItem(DISMISS_KEY, latestVersion);
    }
    setUpdateAvailable(false);
  }, [latestVersion]);

  return { updateAvailable, latestVersion, currentVersion: version, releaseInfo, dismissUpdate };
};
