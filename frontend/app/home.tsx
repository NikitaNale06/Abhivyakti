import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function Home() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const greetingName = user?.display_name
    ? user.display_name.split(' ')[0]
    : user?.email
    ? user.email.split('@')[0]
    : null;

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}>
        <View style={styles.header}>
          <View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {greetingName ? `Namaste, ${greetingName} 🙏` : 'Namaste 🙏'}
            </Text>
            <Text style={[typography.h1, { color: colors.textPrimary, marginTop: 2 }]}>
              Ready to sign?
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/recognize')}
          style={[styles.hero, { backgroundColor: colors.primary }]}
          accessibilityLabel="Recognize a sign"
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Recognize a Sign</Text>
              <Text style={styles.heroSub}>Point your camera at an ISL sign</Text>
            </View>
            <View style={styles.heroIcon}>
              <Ionicons name="scan" size={26} color="#FFFFFF" />
            </View>
          </View>
        </Pressable>

        {/* ── AI Personalized ISL Academy Banner ── */}
        <Pressable
          onPress={() => router.push('/ai-learn')}
          style={({ pressed }) => [
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              borderWidth: 2,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginTop: spacing.md,
              opacity: pressed ? 0.9 : 1,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
          accessibilityLabel="AI ISL Personalized Learning Academy"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: radius.md,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="sparkles" size={26} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[typography.h3, { color: colors.textPrimary }]}>
                    AI ISL Academy
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.primarySoft,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: radius.pill,
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>NEW</Text>
                  </View>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>
                  Personalized Roadmap • 9 Modules • Quizzes & AI Tutor
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-circle" size={28} color={colors.primary} />
          </View>
        </Pressable>

        <View style={styles.row}>
          <ShortcutCard
            icon="book-outline"
            title="Learn"
            subtitle="Alphabets & numbers"
            onPress={() => router.push('/(tabs)/learn')}
          />
          <ShortcutCard
            icon="time-outline"
            title="History"
            subtitle="Past attempts"
            onPress={() => router.push('/(tabs)/history')}
          />
        </View>

        <Text
          style={[
            typography.h3,
            { color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md },
          ]}
        >
          Continue learning
        </Text>

        <Pressable onPress={() => router.push('/lesson/A')}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.lessonBadge, { backgroundColor: colors.primarySoft }]}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 20 }}>A</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>
                  Alphabets – Set 1
                </Text>
                <Text
                  style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}
                >
                  12 of 26 signs practiced
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Card>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function ShortcutCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.shortcut, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityLabel={title}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: spacing.sm }]}>
        {title}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  hero: { borderRadius: radius.lg, padding: spacing.lg },
  heroContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTextWrap: { flex: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  shortcut: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg },
  lessonBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});