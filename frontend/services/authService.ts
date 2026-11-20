import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for local storage
const TOKEN_STORAGE_KEY = '@abhivyakti/auth_tokens';
const PROFILE_STORAGE_KEY = '@abhivyakti/auth_profile';

// Production backend URL — always use this
export const API_BASE_URL = 'https://abhivyakti-backend-486350221693.asia-south1.run.app';

export function getApiBaseUrl(): string {
  return API_BASE_URL.replace(/\/+$/, '');
}

// Types matching the OpenAPI schema
export interface RegisterRequest {
  display_name: string; // min 2, max 80
  email: string;
  password: string; // min 8, max 128
  confirm_password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  display_name?: string | null;
  photo_url?: string | null;
  email_verified?: boolean;
  provider?: string;
}

export interface SuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface GoogleOAuthURL {
  url: string;
}

export interface FirebaseTokenRequest {
  firebase_id_token: string;
}

function parseErrorMessage(data: any, defaultMsg: string): string {
  if (!data) return defaultMsg;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    const msgs = data.detail.map((err: any) => {
      const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : '';
      return field ? `${field}: ${err.msg}` : err.msg;
    });
    return msgs.join(', ');
  }
  if (typeof data.message === 'string') return data.message;
  return defaultMsg;
}

// API methods
export async function registerUser(req: RegisterRequest): Promise<TokenResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMsg = parseErrorMessage(body, `Registration failed (${res.status})`);
    throw new Error(errorMsg);
  }

  const responseData = body as SuccessResponse<TokenResponse>;
  if (!responseData?.data?.access_token) {
    throw new Error(responseData?.message || 'Invalid response from server.');
  }

  return responseData.data;
}

export async function loginUser(req: LoginRequest): Promise<TokenResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMsg = parseErrorMessage(body, `Login failed (${res.status})`);
    throw new Error(errorMsg);
  }

  const responseData = body as SuccessResponse<TokenResponse>;
  if (!responseData?.data?.access_token) {
    throw new Error(responseData?.message || 'Invalid response from server.');
  }

  return responseData.data;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMsg = parseErrorMessage(body, 'Failed to refresh token.');
    throw new Error(errorMsg);
  }

  const responseData = body as SuccessResponse<TokenResponse>;
  return responseData.data;
}

export async function getUserProfile(accessToken: string): Promise<UserProfile> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMsg = parseErrorMessage(body, 'Failed to fetch user profile.');
    throw new Error(errorMsg);
  }

  const responseData = body as SuccessResponse<UserProfile>;
  return responseData.data;
}

export async function logoutUser(accessToken: string): Promise<void> {
  try {
    const baseUrl = getApiBaseUrl();
    await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    // Ignored so local logout still completes
  }
}

export async function getGoogleOAuthURL(): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/auth/google`, {
    method: 'GET',
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMsg = parseErrorMessage(body, 'Failed to get Google OAuth URL.');
    throw new Error(errorMsg);
  }

  const responseData = body as GoogleOAuthURL;
  let url = responseData.url;

  // The backend is configured with localhost:8000 as redirect_uri (Cloud Run env var issue).
  // Rewrite it to the production backend URL so Google redirects there correctly.
  const PRODUCTION_BASE = 'https://abhivyakti-backend-486350221693.asia-south1.run.app';
  url = url.replace(
    /redirect_uri=([^&]+)/,
    (_match: string, encoded: string) => {
      const decoded = decodeURIComponent(encoded);
      const fixed = decoded
        .replace(/http:\/\/localhost:\d+/, PRODUCTION_BASE)
        .replace(/http:\/\/127\.0\.0\.1:\d+/, PRODUCTION_BASE)
        .replace(/http:\/\/10\.0\.2\.2:\d+/, PRODUCTION_BASE);
      return `redirect_uri=${encodeURIComponent(fixed)}`;
    }
  );

  // Ensure account picker is always shown
  if (url.includes('prompt=')) {
    url = url.replace(/prompt=[^&]+/, 'prompt=select_account');
  } else {
    url += (url.includes('?') ? '&' : '?') + 'prompt=select_account';
  }

  return url;
}

// Returns the corrected production redirect URI (for use in WebBrowser.openAuthSessionAsync)
export function getGoogleCallbackUrl(): string {
  return `https://abhivyakti-backend-486350221693.asia-south1.run.app/api/v1/auth/google/callback`;
}

export async function exchangeGoogleAuthCode(code: string): Promise<TokenResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/auth/google/callback?code=${encodeURIComponent(code)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMsg = parseErrorMessage(body, `Google authentication failed (${res.status})`);
    throw new Error(errorMsg);
  }

  const responseData = body as SuccessResponse<TokenResponse>;
  if (!responseData?.data?.access_token) {
    throw new Error(responseData?.message || 'Invalid response from Google authentication.');
  }

  return responseData.data;
}

export async function exchangeGoogleFirebaseToken(firebaseIdToken: string): Promise<TokenResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/auth/google/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firebase_id_token: firebaseIdToken.trim() }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMsg = parseErrorMessage(body, 'Google token exchange failed.');
    throw new Error(errorMsg);
  }

  const responseData = body as SuccessResponse<TokenResponse>;
  if (!responseData?.data?.access_token) {
    if ((body as any)?.access_token) {
      return body as TokenResponse;
    }
    throw new Error(responseData?.message || 'Invalid token response from server.');
  }

  return responseData.data;
}

// Storage helpers
export async function saveAuthTokens(tokens: TokenResponse): Promise<void> {
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

export async function loadAuthTokens(): Promise<TokenResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenResponse) : null;
  } catch {
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export async function loadSavedUserProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export async function clearAuthStorage(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, PROFILE_STORAGE_KEY]);
}
