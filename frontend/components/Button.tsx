import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label, onPress, variant = 'primary', loading, disabled, fullWidth, style,
}: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  const bg = isPrimary ? colors.primary : isSecondary ? colors.surface : 'transparent';
  const textColor = isPrimary ? '#FFFFFF' : colors.textPrimary;
  const borderColor = isSecondary ? colors.border : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: isSecondary ? 1 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[typography.bodyStrong, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});