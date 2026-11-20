import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage, LANGUAGES } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Ionicons } from '@expo/vector-icons';

const THEME_OPTIONS = [
  { key: 'system', label: 'System default', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
] as const;

export default function Settings() {
  const router = useRouter();
  const { colors, preference, setPreference } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { user, isLoggedIn, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your Abhivyakti account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}>
        {/* ── 1. ACCOUNT SECTION ── */}
        <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          Account
        </Text>
        <Card style={styles.accountCard}>
          {isLoggedIn && user ? (
            <View>
              {/* User Info Header */}
              <View style={styles.userInfoRow}>
                {user.photo_url ? (
                  <Image source={{ uri: user.photo_url }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarInitial}>
                      {(user.display_name || user.email || 'A')[0].toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={styles.userDetails}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 17 }]}>
                    {user.display_name || 'Abhivyakti User'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                    {user.email}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.providerBadge,
                        { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                      ]}
                    >
                      <Ionicons
                        name={user.provider === 'google' ? 'logo-google' : 'mail'}
                        size={11}
                        color={colors.primary}
                      />
                      <Text style={[styles.providerBadgeText, { color: colors.primary }]}>
                        {user.provider ? user.provider.toUpperCase() : 'EMAIL'}
                      </Text>
                    </View>
                    {user.email_verified && (
                      <View
                        style={[
                          styles.providerBadge,
                          { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10B981' },
                        ]}
                      >
                        <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                        <Text style={[styles.providerBadgeText, { color: '#10B981' }]}>
                          VERIFIED
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Logout Button */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.logoutBtn,
                  {
                    backgroundColor: colors.error + '14',
                    borderColor: colors.error + '35',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                accessibilityLabel="Log out"
              >
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
                <Text style={[typography.bodyStrong, { color: colors.error, marginLeft: spacing.sm }]}>
                  Log Out
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.loggedOutWrap}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.border }]}>
                <Ionicons name="person-outline" size={24} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>
                  Account Access
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Please sign in to view your profile and manage account details.
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/')}
                style={[styles.signInBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.signInBtnText}>Sign In</Text>
              </Pressable>
            </View>
          )}
        </Card>

        {/* ── 2. APPEARANCE SECTION ── */}
        <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md }]}>
          Appearance
        </Text>
        <Card>
          {THEME_OPTIONS.map((opt, i) => {
            const active = preference === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setPreference(opt.key)}
                style={[
                  styles.row,
                  i !== THEME_OPTIONS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Ionicons name={opt.icon as never} size={20} color={colors.textPrimary} />
                <Text style={[typography.body, { color: colors.textPrimary, flex: 1, marginLeft: spacing.md }]}>
                  {opt.label}
                </Text>
                {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            );
          })}
        </Card>

        {/* ── 3. LANGUAGE SECTION ── */}
        <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md }]}>
          Language
        </Text>
        <Card>
          {LANGUAGES.map((lang, i) => {
            const active = language.code === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => setLanguage(lang.code)}
                style={[
                  styles.row,
                  i !== LANGUAGES.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1 }]}>
                  {lang.native}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginRight: spacing.md }]}>
                  {lang.name}
                </Text>
                {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    padding: spacing.lg,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  userDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  providerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.lg,
  },
  loggedOutWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signInBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
