import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Storage keys
const ACCESS_TOKEN_KEY = 'auth:access_token';
const REFRESH_TOKEN_KEY = 'auth:refresh_token';
const TOKEN_EXPIRY_KEY = 'auth:token_expiry';
const USER_EMAIL_KEY = 'auth:user_email';
const REMEMBER_ME_KEY = 'auth:remember_me';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

// Types
export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type User = {
  id: number;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  onboarding_complete: boolean;
};

export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
};

// Storage helpers that work on both native and web
async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// Token management
export async function storeTokens(
  tokens: TokenPair,
  email: string,
  rememberMe: boolean = true,
): Promise<void> {
  // Calculate expiry timestamp (subtract 60s buffer for safety)
  const expiryTime = Date.now() + (tokens.expires_in - 60) * 1000;

  await setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  await setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  await setItem(TOKEN_EXPIRY_KEY, String(expiryTime));
  await setItem(USER_EMAIL_KEY, email);
  await setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function getStoredEmail(): Promise<string | null> {
  return getItem(USER_EMAIL_KEY);
}

export async function getRememberMe(): Promise<boolean> {
  const value = await getItem(REMEMBER_ME_KEY);
  return value === 'true';
}

export async function isTokenExpired(): Promise<boolean> {
  const expiry = await getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() >= parseInt(expiry, 10);
}

export async function clearTokens(): Promise<void> {
  await deleteItem(ACCESS_TOKEN_KEY);
  await deleteItem(REFRESH_TOKEN_KEY);
  await deleteItem(TOKEN_EXPIRY_KEY);
  await deleteItem(USER_EMAIL_KEY);
  // Keep remember_me preference
}

// Check if we should attempt auto-login
export async function hasValidSession(): Promise<boolean> {
  const rememberMe = await getRememberMe();
  if (!rememberMe) {
    // User didn't want to stay signed in, clear any stale tokens
    await clearTokens();
    return false;
  }

  const refreshToken = await getRefreshToken();
  return !!refreshToken;
}

// API calls
export async function login(
  email: string,
  password: string,
): Promise<TokenPair> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Login failed');
  }

  return res.json();
}

export async function register(
  email: string,
  password: string,
): Promise<TokenPair> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Registration failed');
  }

  return res.json();
}

export async function refreshTokens(): Promise<TokenPair> {
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      access_token: accessToken || '',
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 0,
    }),
  });

  if (!res.ok) {
    // Refresh failed - clear tokens and force re-login
    await clearTokens();
    throw new Error('Session expired');
  }

  return res.json();
}

export async function fetchCurrentUser(accessToken: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch user');
  }

  const data = await res.json();

  // Ensure onboarding_complete has a default value
  return {
    ...data,
    onboarding_complete: data.onboarding_complete ?? false,
  };
}

export async function logout(): Promise<void> {
  const accessToken = await getAccessToken();

  // Call logout endpoint if we have a token
  if (accessToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {
      // Ignore logout API errors
    }
  }

  await clearTokens();
}

// Authenticated fetch helper
export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  let accessToken = await getAccessToken();
  const expired = await isTokenExpired();

  // Refresh token if expired
  if (expired && accessToken) {
    try {
      const email = await getStoredEmail();
      const rememberMe = await getRememberMe();
      const newTokens = await refreshTokens();
      await storeTokens(newTokens, email || '', rememberMe);
      accessToken = newTokens.access_token;
    } catch {
      // Refresh failed, clear auth state
      await clearTokens();
      throw new Error('Session expired');
    }
  }

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  return fetch(url, {
    ...options,
    headers,
  });
}
