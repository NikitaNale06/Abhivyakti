import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Screen } from '@/components/Screen';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    // TODO: add your login / signup logic here
    router.replace('/(tabs)');
  };

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
                    onChangeText={setName}
                    autoCapitalize="words"
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
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={[typography.caption, styles.label, { color: colors.textSecondary }]}>
                Password
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
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
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

            {/* Submit button */}
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[typography.bodyStrong, { color: '#FFFFFF' }]}>
                {isSignUp ? 'Sign Up' : 'Log In'}
              </Text>
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
            <Pressable onPress={() => setIsSignUp((v) => !v)}>
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

          {/* ── Social button ── */}
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.socialBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
              Google
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoWrap: {
    width: 200,
    height: 200,
    borderRadius: radius.xl,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  formCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
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
});
