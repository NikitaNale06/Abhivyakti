/**
 * Scenario Educational Illustration Viewer Component.
 * NEW FILE — strictly shows educational context scenes, NEVER hand signs.
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface ScenarioImageProps {
  base64Image?: string | null;
  caption?: string;
  topic?: string;
}

export function ScenarioImage({ base64Image, caption, topic }: ScenarioImageProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {base64Image ? (
        <Image
          source={{ uri: `data:image/png;base64,${base64Image}` }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.fallbackContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="easel-outline" size={40} color={colors.primary} />
          <Text style={[styles.fallbackTitle, { color: colors.textPrimary }]}>
            {topic || 'Everyday ISL Practice Scene'}
          </Text>
          <Text style={[styles.fallbackSub, { color: colors.textSecondary }]}>
            Visualize the environment, culture, and context of this conversation.
          </Text>
        </View>
      )}

      {caption ? (
        <View style={styles.captionArea}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.captionText, { color: colors.textSecondary }]}>{caption}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: spacing.md,
  },
  image: {
    width: '100%',
    height: 180,
  },
  fallbackContainer: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  fallbackTitle: {
    ...typography.bodyStrong,
    textAlign: 'center',
  },
  fallbackSub: {
    ...typography.caption,
    textAlign: 'center',
  },
  captionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  captionText: {
    ...typography.caption,
    flex: 1,
  },
});
