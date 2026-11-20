/**
 * Streak Badge Component displaying daily study streak.
 * NEW FILE
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface StreakBadgeProps {
  streakDays: number;
}

export function StreakBadge({ streakDays }: StreakBadgeProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
      <Ionicons name="flame" size={18} color={colors.primary} />
      <Text style={[styles.text, { color: colors.primary }]}>
        {streakDays} {streakDays === 1 ? 'day' : 'days'} streak
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  text: {
    ...typography.caption,
    fontWeight: '700',
  },
});
