import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const ALPHABETS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function Learn() {
  const { colors } = useTheme();
  const router = useRouter();

  const handleOpen3D = (letter?: string) => {
    router.push({
      pathname: '/learn-3d',
      params: letter ? { initial: letter } : undefined,
    });
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h1, { color: colors.textPrimary }]}>Learn ISL</Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
              Indian Sign Language Learning
            </Text>
          </View>
          <Pressable
            onPress={() => handleOpen3D()}
            style={[styles.studioBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Open 3D Sign Studio"
          >
            <Ionicons name="cube" size={18} color="#FFFFFF" />
            <Text style={styles.studioBtnText}>3D Studio</Text>
          </Pressable>
        </View>

        {/* 3D Studio Featured Hero Card */}
        <Pressable onPress={() => handleOpen3D()}>
          <Card style={{ borderWidth: 1.5, borderColor: colors.primary }}>
            <View style={styles.heroRow}>
              <View style={[styles.heroIconBox, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="hand-right" size={32} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <View style={styles.badgeRow}>
                  <Text style={[typography.h3, { color: colors.textPrimary }]}>
                    3D Hand Studio
                  </Text>
                  <View style={[styles.miniBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.miniBadgeText}>A–Z</Text>
                  </View>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                  360° interactive view • 16 rigged bones • Pose morphing
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </View>
          </Card>
        </Pressable>

        {/* Alphabets Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>Alphabets</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Tap any letter to view 3D pose
          </Text>
        </View>

        <View style={styles.grid}>
          {ALPHABETS.map((letter) => {
            const isDynamic = letter === 'J' || letter === 'Z';
            return (
              <Pressable
                key={letter}
                onPress={() => handleOpen3D(letter)}
                style={[
                  styles.tile,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                accessibilityLabel={`Learn sign for letter ${letter}`}
              >
                <Text style={[styles.tileLetter, { color: colors.textPrimary }]}>{letter}</Text>
                <View style={styles.tileFooter}>
                  <Ionicons name="cube-outline" size={11} color={colors.textSecondary} />
                  {isDynamic && (
                    <View style={[styles.dotDynamic, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Numbers Section */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>Numbers</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>0 to 9</Text>
        </View>

        <View style={styles.grid}>
          {NUMBERS.map((num) => (
            <Pressable
              key={num}
              onPress={() => router.push(`/lesson/${num}`)}
              style={[
                styles.tile,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              accessibilityLabel={`Learn sign for number ${num}`}
            >
              <Text style={[styles.tileLetter, { color: colors.textPrimary }]}>{num}</Text>
            </Pressable>
          ))}
        </View>

        {/* Info Card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="shield-checkmark-outline" size={24} color="#10B981" />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>
              Verified ISL Signs
            </Text>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
              ]}
            >
              All alphabet poses are mapped to authentic Indian Sign Language fingerspelling, fully aligned with the app’s real-time AI recognition model.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  studioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    gap: 6,
  },
  studioBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    width: '21.5%',
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 4,
  },
  tileLetter: {
    fontSize: 22,
    fontWeight: '700',
  },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  dotDynamic: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  infoCard: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.xl,
  },
});