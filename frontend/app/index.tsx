import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const RNWebView = WebView as any;
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getGoogleOAuthURL, getGoogleCallbackUrl, TokenResponse } from '@/services/authService';
import { Screen } from '@/components/Screen';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    login,
    register,
    loginWithGoogleCode,
    loginWithGoogleToken,
    setSessionFromTokens,
    isLoggedIn,
    isLoading: authLoading,
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // In-app Google OAuth WebView state (auto-captures backend JSON response)
  const webViewRef = useRef<WebView>(null);
  const [showGoogleWebView, setShowGoogleWebView] = useState(false);
  const [googleAuthUrl, setGoogleAuthUrl] = useState('');
  const [webViewLoading, setWebViewLoading] = useState(true);

  // 1-Click Client Popup state for POST /api/v1/auth/google/token
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [firebaseTokenInput, setFirebaseTokenInput] = useState('');
  const [tokenSubmitting, setTokenSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      router.replace('/(tabs)');
    }
  }, [authLoading, isLoggedIn]);

  // Deep link listener in case OAuth redirects to app scheme
  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      const url = event.url;
      if (url.includes('code=')) {
        const match = url.match(/[?&]code=([^&#]+)/);
        if (match && match[1]) {
          const code = decodeURIComponent(match[1]);
          setSubmitting(true);
          const res = await loginWithGoogleCode(code);
          setSubmitting(false);
          if (res.success) {
            router.replace('/(tabs)');
          } else {
            setErrorMessage(res.error || 'Google login failed.');
          }
        }
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => {
      sub.remove();
    };
  }, []);

  const handleSubmit = async () => {
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (isSignUp) {
      const cleanName = name.trim();
      if (!cleanName || cleanName.length < 2) {
        setErrorMessage('Display name must be at least 2 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setSubmitting(true);
      const res = await register(cleanName, cleanEmail, password, confirmPassword);
      setSubmitting(false);

      if (res.success) {
        router.replace('/(tabs)');
      } else {
        setErrorMessage(res.error || 'Registration failed.');
      }
    } else {
      setSubmitting(true);
      const res = await login(cleanEmail, password);
      setSubmitting(false);

      if (res.success) {
        router.replace('/(tabs)');
      } else {
        setErrorMessage(res.error || 'Login failed. Please check credentials.');
      }
    }
  };

  // ── Seamless Google OAuth WebView Interceptor (Solves browser JSON hang) ──
  const handleStartGoogleSignIn = async () => {
    try {
      setErrorMessage(null);
      setGoogleLoading(true);
      const url = await getGoogleOAuthURL();
      setGoogleAuthUrl(url);
      setWebViewLoading(true);
      setShowGoogleWebView(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to start Google sign-in.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const raw = event.nativeEvent?.data;
      if (!raw || !raw.includes('access_token')) return;
      const jsonMatch = raw.match(/\{[\s\S]*"access_token"[\s\S]*\}/);
      if (!jsonMatch) return;
      const parsed = JSON.parse(jsonMatch[0]);
      const tokenData: TokenResponse = parsed.data || parsed;
      if (tokenData?.access_token) {
        setShowGoogleWebView(false);
        setSubmitting(true);
        await setSessionFromTokens(tokenData);
        setSubmitting(false);
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.warn('[Google Auth] WebView message parse error:', err);
    }
  };

  // ── Google 1-Click Client Popup Handler (POST /api/v1/auth/google/token) ──
  const handleOpenGooglePopup = () => {
    setTokenError(null);
    setShowTokenModal(true);
  };

  const handleClientTokenExchange = async (tokenOverride?: string) => {
    const rawToken = (tokenOverride || firebaseTokenInput).trim();
    if (!rawToken) {
      setTokenError('Please enter a Firebase / Google ID token.');
      return;
    }

    setTokenSubmitting(true);
    setTokenError(null);
    try {
      const res = await loginWithGoogleToken(rawToken);
      if (res.success) {
        setShowTokenModal(false);
        setFirebaseTokenInput('');
        router.replace('/(tabs)');
      } else {
        setTokenError(res.error || 'Google token exchange failed.');
      }
    } catch (err: any) {
      setTokenError(err?.message || 'Authentication error.');
    } finally {
      setTokenSubmitting(false);
    }
  };

  const handleBrowserGoogleSession = async () => {
    try {
      setTokenError(null);
      setGoogleLoading(true);
      const authUrl = await getGoogleOAuthURL();
      const redirectUri = getGoogleCallbackUrl();

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        // Check for id_token in hash or code in query
        const matchToken = result.url.match(/[#&]id_token=([^&]+)/);
        if (matchToken && matchToken[1]) {
          const idToken = decodeURIComponent(matchToken[1]);
          await handleClientTokenExchange(idToken);
          return;
        }

        const matchCode = result.url.match(/[?&]code=([^&#]+)/);
        if (matchCode && matchCode[1]) {
          const code = decodeURIComponent(matchCode[1]);
          setTokenSubmitting(true);
          const res = await loginWithGoogleCode(code);
          setTokenSubmitting(false);

          if (res.success) {
            setShowTokenModal(false);
            router.replace('/(tabs)');
          } else {
            setTokenError(res.error || 'Google login failed.');
          }
        }
      }
    } catch (err: any) {
      setTokenError(err?.message || 'Google Sign-In failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Screen>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Branding ── */}
          <View style={styles.brandWrap}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityLabel="Abhivyakti logo"
              />
            </View>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              Learn & recognize Indian Sign Language
            </Text>
          </View>

          {/* ── Form card ── */}
          <View
            style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing.lg }]}>
              {isSignUp ? 'Create account' : 'Welcome back'}
            </Text>

            {/* Error Message Banner */}
            {errorMessage && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: colors.error + '15', borderColor: colors.error + '40' },
                ]}
              >
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text
                  style={[
                    typography.caption,
                    { color: colors.error, marginLeft: spacing.xs, flex: 1 },
                  ]}
                >
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Name (sign-up only) */}
            {isSignUp && (
              <View style={styles.fieldWrap}>
                <Text style={[typography.caption, styles.label, { color: colors.textSecondary }]}>
                  Full Name
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="Your name"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={(t) => {
                      setName(t);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="words"
                    editable={!submitting}
                  />
                </View>
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text style={[typography.caption, styles.label, { color: colors.textSecondary }]}>
                Email
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
              >
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={[typography.caption, styles.label, { color: colors.textSecondary }]}>
                Password {isSignUp ? '(min. 8 characters)' : ''}
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!submitting}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password (sign-up only) */}
            {isSignUp && (
              <View style={styles.fieldWrap}>
                <Text style={[typography.caption, styles.label, { color: colors.textSecondary }]}>
                  Confirm Password
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!submitting}
                  />
                  <Pressable onPress={() => setShowConfirmPassword((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Submit button */}
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: submitting ? 0.75 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={[typography.bodyStrong, { color: '#FFFFFF' }]}>
                  {isSignUp ? 'Sign Up' : 'Log In'}
                </Text>
              )}
            </Pressable>

            {!isSignUp && (
              <Pressable style={styles.forgotWrap}>
                <Text style={[typography.caption, { color: colors.primary }]}>Forgot password?</Text>
              </Pressable>
            )}
          </View>

          {/* ── Toggle login / sign-up ── */}
          <View style={styles.toggleRow}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <Pressable
              onPress={() => {
                setIsSignUp((v) => !v);
                setErrorMessage(null);
              }}
            >
              <Text
                style={[typography.bodyStrong, { color: colors.primary, marginLeft: spacing.xs }]}
              >
                {isSignUp ? 'Log In' : 'Sign Up'}
              </Text>
            </Pressable>
          </View>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text
              style={[typography.caption, { color: colors.textMuted, marginHorizontal: spacing.md }]}
            >
              or continue with
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* ── Google Sign In Button ── */}
          <Pressable
            onPress={handleStartGoogleSignIn}
            disabled={googleLoading || submitting}
            style={({ pressed }) => [
              styles.socialBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── In-App Google OAuth WebView Modal (Auto-captures Cloud Run JSON) ── */}
      <Modal
        visible={showGoogleWebView}
        animationType="slide"
        onRequestClose={() => setShowGoogleWebView(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="logo-google" size={20} color={colors.primary} />
              <Text style={[typography.h3, { color: colors.textPrimary }]}>
                Sign in with Google
              </Text>
            </View>
            <Pressable
              onPress={() => setShowGoogleWebView(false)}
              hitSlop={12}
              style={{ padding: spacing.xs }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Loading indicator */}
          {webViewLoading && (
            <View style={{ padding: spacing.xs, alignItems: 'center', backgroundColor: colors.primarySoft }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}

          {/* WebView */}
          {googleAuthUrl ? (
            <RNWebView
              ref={webViewRef}
              source={{ uri: googleAuthUrl }}
              onLoadStart={() => setWebViewLoading(true)}
              onLoadEnd={() => {
                setWebViewLoading(false);
                // Immediately check if the JSON response is already loaded in the DOM
                webViewRef.current?.injectJavaScript(`
                  (function() {
                    try {
                      var t = document.body ? (document.body.innerText || document.body.textContent) : '';
                      if (t && t.indexOf('access_token') !== -1) {
                        window.ReactNativeWebView.postMessage(t);
                      }
                    } catch(e) {}
                  })();
                  true;
                `);
              }}
              injectedJavaScript={`
                (function() {
                  function check() {
                    try {
                      var t = document.body ? (document.body.innerText || document.body.textContent) : '';
                      if (t && t.indexOf('access_token') !== -1) {
                        window.ReactNativeWebView.postMessage(t);
                      }
                    } catch(e) {}
                  }
                  check();
                  setInterval(check, 200);
                })();
                true;
              `}
              onMessage={handleWebViewMessage}
              onShouldStartLoadWithRequest={(req: any) => {
                // If the backend tries to redirect to localhost, rewrite it on the fly
                if (
                  req.url &&
                  req.url.includes('/api/v1/auth/google/callback') &&
                  (req.url.includes('localhost') || req.url.includes('127.0.0.1'))
                ) {
                  const fixed = req.url.replace(
                    /http:\/\/(localhost|127\.0\.0\.1):\d+/,
                    'https://abhivyakti-backend-486350221693.asia-south1.run.app'
                  );
                  webViewRef.current?.injectJavaScript(`window.location.href = "${fixed}"; true;`);
                  return false;
                }
                return true;
              }}
              userAgent={
                Platform.OS === 'android'
                  ? 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
                  : 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
              }
              javaScriptEnabled
              domStorageEnabled
              style={{ flex: 1 }}
            />
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* ── 1-Click Client Popup Modal for POST /api/v1/auth/google/token ── */}
      <Modal
        visible={showTokenModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTokenModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.googleIconBadge, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="logo-google" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h3, { color: colors.textPrimary }]}>
                    Google Sign-In
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    1-Click Client Popup • POST /api/v1/auth/google/token
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowTokenModal(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Error in modal */}
            {tokenError && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: colors.error + '15', borderColor: colors.error + '40', marginVertical: spacing.sm },
                ]}
              >
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={[typography.caption, { color: colors.error, marginLeft: spacing.xs, flex: 1 }]}>
                  {tokenError}
                </Text>
              </View>
            )}

            {/* 1-Click Fast Button */}
            <Pressable
              onPress={handleBrowserGoogleSession}
              disabled={googleLoading || tokenSubmitting}
              style={({ pressed }) => [
                styles.modalPrimaryBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {googleLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="flash" size={18} color="#FFFFFF" />
                  <Text style={[typography.bodyStrong, { color: '#FFFFFF', marginLeft: spacing.xs }]}>
                    1-Click Google Sign-In
                  </Text>
                </>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.modalDividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[typography.caption, { color: colors.textMuted, marginHorizontal: spacing.sm, fontSize: 11 }]}>
                OR VERIFY FIREBASE ID TOKEN
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Token Input */}
            <View style={styles.tokenInputWrap}>
              <TextInput
                style={[
                  styles.tokenInput,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Paste firebase_id_token here..."
                placeholderTextColor={colors.textMuted}
                value={firebaseTokenInput}
                onChangeText={(t) => {
                  setFirebaseTokenInput(t);
                  if (tokenError) setTokenError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                numberOfLines={3}
                editable={!tokenSubmitting}
              />
            </View>

            {/* Submit Token Button */}
            <Pressable
              onPress={() => handleClientTokenExchange()}
              disabled={tokenSubmitting || !firebaseTokenInput.trim()}
              style={({ pressed }) => [
                styles.modalSecondaryBtn,
                {
                  borderColor: colors.primary,
                  backgroundColor: colors.primarySoft,
                  opacity: (!firebaseTokenInput.trim() || tokenSubmitting) ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {tokenSubmitting ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={[typography.bodyStrong, { color: colors.primary, marginLeft: spacing.xs }]}>
                    Exchange Token with Backend
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoWrap: {
    width: 170,
    height: 170,
    borderRadius: radius.xl,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 170,
    height: 170,
  },
  formCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  fieldWrap: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  eyeBtn: {
    padding: spacing.xs,
  },
  submitBtn: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: spacing.xs,
  },
  forgotWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48,
    marginTop: spacing.lg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  googleIconBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  modalDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  tokenInputWrap: {
    marginBottom: spacing.md,
  },
  tokenInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
});
