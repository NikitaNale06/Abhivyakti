import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Screen } from '@/components/Screen';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function LessonDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen edges={['top']}>
      <View style={styles.center}>
        <Text style={[typography.display, { color: colors.textPrimary }]}>{id}</Text>
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' },
          ]}
        >
          Lesson detail for "{id}" — sign media, instructions and practice tips coming soon.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});