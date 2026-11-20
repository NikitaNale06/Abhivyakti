/**
 * Quiz Option Button Component.
 * NEW FILE
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface QuizOptionProps {
  text: string;
  index: number;
  isSelected: boolean;
  isCorrect?: boolean | null; // null if unrevealed
  isAnswerRevealed: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function QuizOption({
  text,
  index,
  isSelected,
  isCorrect,
  isAnswerRevealed,
  onPress,
  disabled = false,
}: QuizOptionProps) {
  const { colors } = useTheme();

  const getBorderColor = () => {
    if (!isAnswerRevealed) {
      return isSelected ? colors.primary : colors.border;
    }
    if (isCorrect === true) return colors.success;
    if (isSelected && isCorrect === false) return colors.error;
    return colors.border;
  };

  const getBackgroundColor = () => {
    if (!isAnswerRevealed) {
      return isSelected ? colors.primarySoft : colors.surface;
    }
    if (isCorrect === true) return `${colors.success}15`;
    if (isSelected && isCorrect === false) return `${colors.error}15`;
    return colors.surface;
  };

  const getOptionLetter = (i: number) => String.fromCharCode(65 + i);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.container,
        {
          borderColor: getBorderColor(),
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <Text style={[styles.letter, { color: isSelected ? colors.primary : colors.textSecondary }]}>
        {getOptionLetter(index)}.
      </Text>
      <Text style={[styles.text, { color: colors.textPrimary }]}>{text}</Text>

      {isAnswerRevealed && isCorrect === true && (
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
      )}
      {isAnswerRevealed && isSelected && isCorrect === false && (
        <Ionicons name="close-circle" size={20} color={colors.error} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  letter: {
    ...typography.bodyStrong,
    width: 24,
  },
  text: {
    ...typography.body,
    flex: 1,
  },
});
