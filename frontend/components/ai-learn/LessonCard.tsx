/**
 * Lesson & Module Card Component for AI Learning.
 * NEW FILE
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { ProgressRing } from './ProgressRing';
import { ISLModuleDef } from '@/services/learningService';

interface LessonCardProps {
  module: ISLModuleDef;
  completedTopicsCount: number;
  onPress: () => void;
  isLocked?: boolean;
  aiPriorityBadge?: string;
}

export function LessonCard({
  module,
  completedTopicsCount,
  onPress,
  isLocked = false,
  aiPriorityBadge,
}: LessonCardProps) {
  const { colors } = useTheme();
  const totalTopics = module.topics.length;
  const progressRatio = totalTopics > 0 ? completedTopicsCount / totalTopics : 0;
  const isDone = completedTopicsCount >= totalTopics;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isLocked}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDone ? colors.success : colors.border,
          opacity: isLocked ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isDone
                ? `${colors.success}15`
                : colors.primarySoft,
            },
          ]}
        >
          <Ionicons
            name={isDone ? 'checkmark-circle' : ((module.icon as any) || 'book')}
            size={22}
            color={isDone ? colors.success : colors.primary}
          />
        </View>

        <View style={styles.titleArea}>
          {aiPriorityBadge ? (
            <View style={[styles.priorityPill, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="sparkles" size={10} color={colors.primary} />
              <Text style={[styles.priorityText, { color: colors.primary }]}>
                {aiPriorityBadge}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {module.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {module.description}
          </Text>
        </View>

        {isLocked ? (
          <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </View>

      <View style={styles.progressContainer}>
        <ProgressRing
          progress={progressRatio}
          label={`${completedTopicsCount}/${totalTopics} topics`}
        />
      </View>

      <View style={styles.footerRow}>
        <View style={styles.metaBadge}>
          <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            ~{module.estimatedMinutes} mins
          </Text>
        </View>
        <View style={styles.metaBadge}>
          <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.primary }]}>
            +{totalTopics * 20} XP
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginBottom: 4,
  },
  priorityText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  titleArea: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    fontSize: 12,
  },
});
