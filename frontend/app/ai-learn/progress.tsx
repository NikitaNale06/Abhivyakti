/**
 * Detailed Learning Analytics & Progress Screen.
 * NEW FILE
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLearning } from '@/context/LearningContext';
import { ISL_MODULE_CATALOG } from '@/services/learningService';
import { ProgressRing } from '@/components/ai-learn/ProgressRing';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function ProgressScreen() {
  const { colors } = useTheme();
  const { profile, modulesProgress, stats, history, resetAllLearningData } = useLearning();

  const totalPossibleTopics = ISL_MODULE_CATALOG.reduce(
    (acc, m) => acc + m.topics.length,
    0,
  );
  const totalCompletedTopics = Object.values(modulesProgress).reduce(
    (acc, m) => acc + m.completedTopics.length,
    0,
  );
  const overallProgress =
    totalPossibleTopics > 0 ? totalCompletedTopics / totalPossibleTopics : 0;

  const handleReset = () => {
    Alert.alert(
      'Reset Learning Progress',
      'Are you sure you want to reset all your AI learning progress, streak, and quiz stats? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllLearningData();
            Alert.alert('Reset Complete', 'Your learning data has been cleared.');
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Overview Card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Overall Curriculum Mastery
        </Text>
        <ProgressRing
          progress={overallProgress}
          label={`${totalCompletedTopics} of ${totalPossibleTopics} topics completed`}
        />

        <View style={styles.gridRow}>
          <View style={styles.gridCell}>
            <Text style={[styles.gridVal, { color: colors.primary }]}>{profile.totalXP}</Text>
            <Text style={[styles.gridLbl, { color: colors.textSecondary }]}>Total XP</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={[styles.gridVal, { color: colors.textPrimary }]}>
              {stats.averageQuizScore}%
            </Text>
            <Text style={[styles.gridLbl, { color: colors.textSecondary }]}>Avg Quiz Score</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={[styles.gridVal, { color: colors.success }]}>{profile.streakDays}</Text>
            <Text style={[styles.gridLbl, { color: colors.textSecondary }]}>Day Streak</Text>
          </View>
        </View>
      </View>

      {/* Weak Areas / Need Practice Section */}
      {stats.weakTopics && stats.weakTopics.length > 0 && (
        <View
          style={[
            styles.card,
            { backgroundColor: `${colors.warning}10`, borderColor: colors.warning },
          ]}
        >
          <View style={styles.cardHeaderWithIcon}>
            <Ionicons name="alert-circle" size={20} color={colors.warning} />
            <Text style={[styles.cardTitle, { color: colors.warning }]}>
              Recommended for Review
            </Text>
          </View>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Topics where quiz scores were below 70%:
          </Text>
          <View style={styles.tagWrap}>
            {stats.weakTopics.map((topic, i) => (
              <View
                key={i}
                style={[styles.weakTag, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.weakTagText, { color: colors.textPrimary }]}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Module-by-Module Breakdown */}
      <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
        Module Breakdown
      </Text>

      {ISL_MODULE_CATALOG.map((mod) => {
        const modProgress = modulesProgress[mod.id];
        const completedCount = modProgress ? modProgress.completedTopics.length : 0;
        const total = mod.topics.length;
        const ratio = total > 0 ? completedCount / total : 0;

        return (
          <View
            key={mod.id}
            style={[styles.moduleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.moduleRowTop}>
              <Text style={[styles.moduleRowTitle, { color: colors.textPrimary }]}>
                {mod.title}
              </Text>
              <Text style={[styles.moduleRowBadge, { color: ratio >= 1 ? colors.success : colors.textSecondary }]}>
                {completedCount}/{total}
              </Text>
            </View>
            <ProgressRing progress={ratio} showPercentage={false} />
          </View>
        );
      })}

      {/* Recent History */}
      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            Recent Study Activity
          </Text>
          {history.slice(0, 5).map((item) => (
            <View
              key={item.id}
              style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.historyInfo}>
                <Text style={[styles.historyTopic, { color: colors.textPrimary }]}>
                  {item.topic}
                </Text>
                <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                  {new Date(item.completedAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.historyMeta}>
                {item.score !== undefined && (
                  <Text style={[styles.historyScore, { color: item.score >= 70 ? colors.success : colors.warning }]}>
                    {item.score}%
                  </Text>
                )}
                <Text style={[styles.historyXP, { color: colors.primary }]}>
                  +{item.xpEarned} XP
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Reset Button */}
      <TouchableOpacity
        onPress={handleReset}
        style={[styles.resetButton, { borderColor: colors.error }]}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh-outline" size={16} color={colors.error} />
        <Text style={[styles.resetText, { color: colors.error }]}>Reset Learning Data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  cardSub: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDD',
  },
  gridCell: {
    alignItems: 'center',
  },
  gridVal: {
    ...typography.h2,
    fontWeight: '700',
  },
  gridLbl: {
    ...typography.caption,
    marginTop: 2,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  weakTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  weakTagText: {
    ...typography.caption,
  },
  sectionHeading: {
    ...typography.h2,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  moduleRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  moduleRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleRowTitle: {
    ...typography.bodyStrong,
    flex: 1,
  },
  moduleRowBadge: {
    ...typography.caption,
    fontWeight: '600',
  },
  historySection: {
    marginTop: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  historyInfo: {
    flex: 1,
  },
  historyTopic: {
    ...typography.bodyStrong,
  },
  historyDate: {
    ...typography.caption,
    marginTop: 2,
  },
  historyMeta: {
    alignItems: 'flex-end',
  },
  historyScore: {
    ...typography.bodyStrong,
  },
  historyXP: {
    ...typography.caption,
    fontWeight: '700',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  resetText: {
    ...typography.caption,
    fontWeight: '700',
  },
});
