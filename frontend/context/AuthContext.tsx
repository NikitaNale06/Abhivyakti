import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  TokenResponse,
  UserProfile,
  loginUser,
  registerUser,
  logoutUser,
  getUserProfile,
  refreshAccessToken,
  exchangeGoogleAuthCode,
  exchangeGoogleFirebaseToken,
  saveAuthTokens,
  loadAuthTokens,
  saveUserProfile,
  loadSavedUserProfile,
  clearAuthStorage,
} from '@/services/authService';

interface AuthContextValue {
  user: UserProfile | null;
  tokens: TokenResponse | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    displayName: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogleCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogleToken: (idToken: string) => Promise<{ success: boolean; error?: string }>;
  setSessionFromTokens: (tokens: TokenResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<TokenResponse | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load initial tokens & profile
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const [savedTokens, savedProfile] = await Promise.all([
          loadAuthTokens(),
          loadSavedUserProfile(),
        ]);

        if (mounted) {
          if (savedProfile) {
            setUser(savedProfile);
          }
          if (savedTokens) {
            setTokens(savedTokens);
          }
        }

        // If tokens exist, verify / update profile from backend
        if (savedTokens?.access_token) {
          try {
            const freshProfile = await getUserProfile(savedTokens.access_token);
            if (mounted) {
              setUser(freshProfile);
              await saveUserProfile(freshProfile);
            }
          } catch (profileErr: any) {
            // If access token expired, try refreshing
            if (savedTokens.refresh_token) {
              try {
                const refreshedTokens = await refreshAccessToken(savedTokens.refresh_token);
                if (mounted) {
                  setTokens(refreshedTokens);
                  await saveAuthTokens(refreshedTokens);
                }
                const freshProfile = await getUserProfile(refreshedTokens.access_token);
                if (mounted) {
                  setUser(freshProfile);
                  await saveUserProfile(freshProfile);
                }
              } catch (refreshErr) {
                // Tokens are invalid or expired
                if (mounted) {
                  setTokens(null);
                  setUser(null);
                  await clearAuthStorage();
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Auth] Failed to initialize auth state:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const tokenData = await loginUser({ email, password });
      setTokens(tokenData);
      await saveAuthTokens(tokenData);

      try {
        const profile = await getUserProfile(tokenData.access_token);
        setUser(profile);
        await saveUserProfile(profile);
      } catch {
        const fallbackProfile: UserProfile = {
          uid: 'user-' + Date.now(),
          email,
          display_name: email.split('@')[0],
          provider: 'email',
        };
        setUser(fallbackProfile);
        await saveUserProfile(fallbackProfile);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login failed.' };
    }
  };

  const register = async (
    displayName: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => {
    try {
      const tokenData = await registerUser({
        display_name: displayName,
        email,
        password,
        confirm_password: confirmPassword,
      });
      setTokens(tokenData);
      await saveAuthTokens(tokenData);

      try {
        const profile = await getUserProfile(tokenData.access_token);
        setUser(profile);
        await saveUserProfile(profile);
      } catch {
        const fallbackProfile: UserProfile = {
          uid: 'user-' + Date.now(),
          email,
          display_name: displayName,
          provider: 'email',
        };
        setUser(fallbackProfile);
        await saveUserProfile(fallbackProfile);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed.' };
    }
  };

  const loginWithGoogleCode = async (code: string) => {
    try {
      const tokenData = await exchangeGoogleAuthCode(code);
      setTokens(tokenData);
      await saveAuthTokens(tokenData);

      try {
        const profile = await getUserProfile(tokenData.access_token);
        setUser(profile);
        await saveUserProfile(profile);
      } catch {
        const fallbackProfile: UserProfile = {
          uid: 'google-' + Date.now(),
          email: '',
          display_name: 'Google User',
          provider: 'google',
        };
        setUser(fallbackProfile);
        await saveUserProfile(fallbackProfile);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Google sign-in failed.' };
    }
  };

  const loginWithGoogleToken = async (idToken: string) => {
    try {
      const tokenData = await exchangeGoogleFirebaseToken(idToken);
      await setSessionFromTokens(tokenData);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Google token exchange failed.' };
    }
  };

  const setSessionFromTokens = async (tokenData: TokenResponse) => {
    setTokens(tokenData);
    await saveAuthTokens(tokenData);

    try {
      const profile = await getUserProfile(tokenData.access_token);
      setUser(profile);
      await saveUserProfile(profile);
    } catch {
      const fallbackProfile: UserProfile = {
        uid: 'google-' + Date.now(),
        email: '',
        display_name: 'Google User',
        provider: 'google',
      };
      setUser(fallbackProfile);
      await saveUserProfile(fallbackProfile);
    }
  };

  const logout = async () => {
    if (tokens?.access_token) {
      await logoutUser(tokens.access_token);
    }
    setTokens(null);
    setUser(null);
    await clearAuthStorage();
  };

  const refreshProfile = async () => {
    if (!tokens?.access_token) return;
    try {
      const freshProfile = await getUserProfile(tokens.access_token);
      setUser(freshProfile);
      await saveUserProfile(freshProfile);
    } catch (err) {
      console.warn('[Auth] Failed to refresh profile:', err);
    }
  };

  const value = useMemo(
    () => ({
      user,
      tokens,
      isLoading,
      isLoggedIn: !!tokens?.access_token,
      login,
      register,
      loginWithGoogleCode,
      loginWithGoogleToken,
      setSessionFromTokens,
      logout,
      refreshProfile,
    }),
    [user, tokens, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
