/**
 * Circular / Linear Progress Bar Component for AI Learning.
 * NEW FILE
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface ProgressRingProps {
  progress: number; // 0 to 1
  label?: string;
  size?: number;
  showPercentage?: boolean;
}

export function ProgressRing({
  progress,
  label,
  showPercentage = true,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const percentText = `${Math.round(clamped * 100)}%`;

  return (
    <View style={styles.container}>
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${clamped * 100}%`,
              backgroundColor: clamped >= 1 ? colors.success : colors.primary,
            },
          ]}
        />
      </View>
      <View style={styles.infoRow}>
        {label ? (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        ) : null}
        {showPercentage ? (
          <Text style={[styles.percentage, { color: colors.textPrimary }]}>{percentText}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: spacing.xs,
  },
  barTrack: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  label: {
    ...typography.caption,
  },
  percentage: {
    ...typography.caption,
    fontWeight: '600',
  },
});
