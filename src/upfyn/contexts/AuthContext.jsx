import React, { createContext, useContext } from 'react';
import { useDesktopAuth } from '../../contexts/DesktopAuthContext';

// Tauri desktop bridge — maps DesktopAuthContext to the Upfyn AuthContext interface
// so all Upfyn components that call useAuth() work seamlessly.

const AuthContext = createContext({
  user: null,
  login: () => {},
  register: () => {},
  logout: () => {},
  isLoading: false,
  needsSetup: false,
  hasCompletedOnboarding: true,
  refreshOnboardingStatus: () => {},
  error: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const desktop = useDesktopAuth();

  const value = {
    user: desktop.user
      ? {
          ...desktop.user,
          username: desktop.user.username || desktop.user.email || 'User',
        }
      : null,
    login: async (username, password) => {
      try {
        await desktop.login(username, password);
        return { success: true };
      } catch (err) {
        return { success: false, error: err?.message || 'Login failed' };
      }
    },
    register: async (firstName, lastName, password, email) => {
      try {
        await desktop.register(email, password, firstName, lastName);
        return { success: true };
      } catch (err) {
        return { success: false, error: err?.message || 'Registration failed' };
      }
    },
    logout: async () => {
      await desktop.logout();
    },
    isLoading: desktop.isLoading,
    needsSetup: false,
    hasCompletedOnboarding: true,
    refreshOnboardingStatus: () => {},
    error: null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
