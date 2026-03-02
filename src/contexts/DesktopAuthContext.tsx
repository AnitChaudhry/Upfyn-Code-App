import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface Subscription {
  id?: string;
  planId?: string;
  status?: string;
  startsAt?: string;
  expiresAt?: string;
}

interface AuthUser {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  access_override?: string;
  subscription?: Subscription;
}

interface AuthState {
  token?: string;
  user?: AuthUser;
  is_authenticated: boolean;
}

interface DesktopAuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasSubscription: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DesktopAuthContext = createContext<DesktopAuthContextType | undefined>(undefined);

export const DesktopAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const hasSubscription = React.useMemo(() => {
    if (!user) return false;
    if (user.access_override === 'full') return true;
    return user.subscription?.status === 'active';
  }, [user]);

  // On mount: check for stored auth, show app immediately, refresh in background
  useEffect(() => {
    const init = async () => {
      try {
        // Read local cache — fast DB read
        const stored: AuthState = await invoke('auth_get_stored');
        if (stored.is_authenticated && stored.user && stored.token) {
          setUser(stored.user);
          setToken(stored.token);
          setIsAuthenticated(true);
        }
      } catch {
        // No stored auth
      } finally {
        // Unblock UI immediately after local check
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Background refresh — runs once after UI is already visible
  const hasRefreshed = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || !token || hasRefreshed.current) return;
    hasRefreshed.current = true;
    const refreshInBackground = async () => {
      try {
        const refreshed: AuthState = await invoke('auth_refresh');
        if (refreshed.is_authenticated && refreshed.user) {
          setUser(refreshed.user);
          setToken(refreshed.token || null);
        } else {
          // Token expired — force re-login
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
        }
      } catch {
        // Network error — keep cached data, user can work offline
      }
    };
    refreshInBackground();
  }, [isAuthenticated, token]);

  const login = useCallback(async (email: string, password: string) => {
    const result: AuthState = await invoke('auth_login', { email, password });
    if (result.is_authenticated && result.user) {
      setUser(result.user);
      setToken(result.token || null);
      setIsAuthenticated(true);
    } else {
      throw new Error('Login failed');
    }
  }, []);

  const register = useCallback(async (email: string, password: string, firstName?: string, lastName?: string) => {
    const result: AuthState = await invoke('auth_register', {
      email,
      password,
      firstName: firstName || null,
      lastName: lastName || null,
    });
    if (result.is_authenticated && result.user) {
      setUser(result.user);
      setToken(result.token || null);
      setIsAuthenticated(true);
    } else {
      throw new Error('Registration failed');
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const result: AuthState = await invoke('auth_login_google');
    if (result.is_authenticated && result.user) {
      setUser(result.user);
      setToken(result.token || null);
      setIsAuthenticated(true);
    } else {
      throw new Error('Google login failed');
    }
  }, []);

  const logout = useCallback(async () => {
    await invoke('auth_logout');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  const refresh = useCallback(async () => {
    const result: AuthState = await invoke('auth_refresh');
    if (result.is_authenticated && result.user) {
      setUser(result.user);
      setToken(result.token || null);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    }
  }, []);

  return (
    <DesktopAuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        hasSubscription,
        login,
        register,
        loginWithGoogle,
        logout,
        refresh,
      }}
    >
      {children}
    </DesktopAuthContext.Provider>
  );
};

export const useDesktopAuth = (): DesktopAuthContextType => {
  const context = useContext(DesktopAuthContext);
  if (!context) {
    throw new Error('useDesktopAuth must be used within a DesktopAuthProvider');
  }
  return context;
};
