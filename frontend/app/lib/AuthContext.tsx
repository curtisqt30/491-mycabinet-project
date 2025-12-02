import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';
import type { AuthState } from './auth';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  refreshTokens,
  fetchCurrentUser,
  storeTokens,
  clearTokens,
  getAccessToken,
  hasValidSession,
  isTokenExpired,
  getStoredEmail,
  getRememberMe,
} from './auth';

type AuthContextType = AuthState & {
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  register: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
  needsOnboarding: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh interval (10 minutes before expiry check)
const REFRESH_CHECK_INTERVAL = 10 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
  });

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Computed: does user need onboarding?
  const needsOnboarding = useMemo(() => {
    return state.isAuthenticated && state.user !== null && !state.user.onboarding_complete;
  }, [state.isAuthenticated, state.user]);

  // Initialize auth state on app load
  const initializeAuth = useCallback(async () => {
    try {
      const hasSession = await hasValidSession();

      if (!hasSession) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          accessToken: null,
        });
        return;
      }

      let accessToken = await getAccessToken();
      const expired = await isTokenExpired();

      // Try to refresh if expired
      if (expired || !accessToken) {
        try {
          const email = await getStoredEmail();
          const rememberMe = await getRememberMe();
          const newTokens = await refreshTokens();
          await storeTokens(newTokens, email || '', rememberMe);
          accessToken = newTokens.access_token;
        } catch {
          // Refresh failed, user needs to re-login
          await clearTokens();
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            accessToken: null,
          });
          return;
        }
      }

      // Fetch current user
      try {
        const user = await fetchCurrentUser(accessToken);
        setState({
          isAuthenticated: true,
          isLoading: false,
          user,
          accessToken,
        });
      } catch {
        // Failed to fetch user, clear auth
        await clearTokens();
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          accessToken: null,
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
      });
    }
  }, []);

  // Login handler
  const login = useCallback(
    async (email: string, password: string, rememberMe: boolean = false) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const tokens = await apiLogin(email, password);
        await storeTokens(tokens, email, rememberMe);

        const user = await fetchCurrentUser(tokens.access_token);

        setState({
          isAuthenticated: true,
          isLoading: false,
          user,
          accessToken: tokens.access_token,
        });
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [],
  );

  // Register handler
  const register = useCallback(
    async (email: string, password: string, rememberMe: boolean = false) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const tokens = await apiRegister(email, password);
        await storeTokens(tokens, email, rememberMe);

        const user = await fetchCurrentUser(tokens.access_token);

        setState({
          isAuthenticated: true,
          isLoading: false,
          user,
          accessToken: tokens.access_token,
        });
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [],
  );

  // Logout handler
  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await apiLogout();
    } finally {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
      });
    }
  }, []);

  // Refresh user data only (without token refresh)
  const refreshUser = useCallback(async () => {
    if (!state.accessToken) return;

    try {
      const user = await fetchCurrentUser(state.accessToken);
      setState((prev) => ({
        ...prev,
        user,
      }));
    } catch {
      // If fetching user fails, try full refresh
      await refreshAuth();
    }
  }, [state.accessToken]);

  // Manual refresh (for pull-to-refresh, etc.)
  const refreshAuth = useCallback(async () => {
    if (!state.isAuthenticated) return;

    try {
      const email = await getStoredEmail();
      const rememberMe = await getRememberMe();
      const newTokens = await refreshTokens();
      await storeTokens(newTokens, email || '', rememberMe);

      const user = await fetchCurrentUser(newTokens.access_token);

      setState((prev) => ({
        ...prev,
        user,
        accessToken: newTokens.access_token,
      }));
    } catch {
      // Refresh failed, force logout
      await logout();
    }
  }, [state.isAuthenticated, logout]);

  // Proactive token refresh
  const checkAndRefreshToken = useCallback(async () => {
    if (!state.isAuthenticated) return;

    const expired = await isTokenExpired();
    if (expired) {
      try {
        const email = await getStoredEmail();
        const rememberMe = await getRememberMe();
        const newTokens = await refreshTokens();
        await storeTokens(newTokens, email || '', rememberMe);

        setState((prev) => ({
          ...prev,
          accessToken: newTokens.access_token,
        }));
      } catch {
        // Silent fail - will retry on next interval or force logout on API call
      }
    }
  }, [state.isAuthenticated]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        // App coming back to foreground
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          void checkAndRefreshToken();
        }
        appStateRef.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [checkAndRefreshToken]);

  // Set up periodic token refresh check
  useEffect(() => {
    if (state.isAuthenticated) {
      refreshTimerRef.current = setInterval(() => {
        void checkAndRefreshToken();
      }, REFRESH_CHECK_INTERVAL);
    } else {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [state.isAuthenticated, checkAndRefreshToken]);

  // Initialize on mount
  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshAuth,
    refreshUser,
    needsOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for checking if user is authenticated (with loading state)
export function useRequireAuth() {
  const auth = useAuth();
  return {
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    needsOnboarding: auth.needsOnboarding,
  };
}