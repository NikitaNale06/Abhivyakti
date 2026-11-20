/**
 * AI ISL Learning Main Dashboard.
 * NEW FILE
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLearning } from '@/context/LearningContext';
import { StreakBadge } from '@/components/ai-learn/StreakBadge';
import { LessonCard } from '@/components/ai-learn/LessonCard';
import { ISL_MODULE_CATALOG, ISLModuleDef } from '@/services/learningService';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function AILearnDashboard() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    profile,
    modulesProgress,
    stats,
    roadmap,
    isGeneratingRoadmap,
    generateRoadmap,
  } = useLearning();

  const [generating, setGenerating] = useState(false);

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? Math.max(StatusBar.currentHeight || 0, 38) : 0,
    36,
  );

  const totalModulesCount = ISL_MODULE_CATALOG.length;
  const completedModulesCount = Object.values(modulesProgress).filter(
    (m) => m.isCompleted,
  ).length;

  const handlePersonalizeRoadmap = () => {
    // Open questionnaire to ask user questions for AI personalization
    router.push('/ai-learn/assessment');
  };

  // Compute prioritized modules dynamically based on Gemini's roadmap
  const orderedModules = useMemo(() => {
    if (!roadmap?.modules || roadmap.modules.length === 0) {
      return ISL_MODULE_CATALOG.map((m, idx) => ({
        ...m,
        priority: idx + 1,
        isAIPrioritized: false,
      }));
    }

    const priorityMap = new Map<string, number>();
    roadmap.modules.forEach((rm, idx) => {
      priorityMap.set(rm.id, rm.priority || idx + 1);
    });

    const list = ISL_MODULE_CATALOG.map((mod) => {
      const priority = priorityMap.get(mod.id) ?? 99;
      return {
        ...mod,
        priority,
        isAIPrioritized: priorityMap.has(mod.id),
      };
    });

    list.sort((a, b) => a.priority - b.priority);
    return list;
  }, [roadmap]);

  const isBusy = isGeneratingRoadmap || generating;

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      {/* Top Bar with accurate safe area padding for notch/status bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: topInset + 6,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          AI ISL Academy
        </Text>
        <StreakBadge streakDays={profile.streakDays} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Personalized AI Roadmap Header / Prompt */}
        {roadmap ? (
          <View style={[styles.roadmapCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <View style={styles.roadmapHeader}>
              <View style={[styles.aiPill, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="sparkles" size={12} color={colors.primary} />
                <Text style={[styles.aiPillText, { color: colors.primary }]}>
                  Gemini AI Personalized Roadmap
                </Text>
              </View>
              <TouchableOpacity
                onPress={handlePersonalizeRoadmap}
                disabled={isBusy}
                style={[styles.regenButton, { borderColor: colors.border }]}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={13} color={colors.textSecondary} />
                    <Text style={[styles.regenText, { color: colors.textSecondary }]}>Adapt</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.roadmapMessage, { color: colors.textPrimary }]}>
              {roadmap.personalized_message}
            </Text>

            {roadmap.quick_wins && roadmap.quick_wins.length > 0 && (
              <View style={styles.quickWinsContainer}>
                <Text style={[styles.quickWinsLabel, { color: colors.textSecondary }]}>
                  AI Quick Wins:
                </Text>
                <View style={styles.quickWinsList}>
                  {roadmap.quick_wins.map((win, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.winRow,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color={colors.success}
                        style={{ marginTop: 2 }}
                      />
                      <Text style={[styles.winText, { color: colors.textPrimary }]}>{win}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/ai-learn/assessment')}
            style={[styles.assessmentBanner, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
          >
            <View style={styles.bannerIcon}>
              <Ionicons name="sparkles" size={24} color={colors.primary} />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, { color: colors.primary }]}>
                Personalize Your ISL Roadmap
              </Text>
              <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                Take a quick 2-minute assessment or generate with Gemini AI.
              </Text>
            </View>
            {isBusy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}

        {/* User Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{profile.totalXP}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total XP</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {profile.level.toUpperCase()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Level</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {completedModulesCount}/{totalModulesCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Modules</Text>
          </View>
        </View>

        {/* Quick Actions Header */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => {
              const firstMod = orderedModules[0] || ISL_MODULE_CATALOG[0];
              router.push({
                pathname: '/ai-learn/lesson',
                params: {
                  moduleId: firstMod.id,
                  topic: firstMod.topics[0],
                },
              });
            }}
          >
            <Ionicons name="play" size={16} color="#FFFFFF" />
            <Text style={styles.quickButtonText} numberOfLines={1}>
              Start Learning
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickButtonSecondary, { borderColor: colors.border, backgroundColor: colors.surface }]}
            activeOpacity={0.8}
            onPress={handlePersonalizeRoadmap}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text
                  style={[styles.quickButtonTextSecondary, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {roadmap ? 'Re-Personalize' : 'Personalize (AI)'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Dynamic AI Modules List Header */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {roadmap ? 'Personalized Curriculum' : 'ISL Curriculum Modules'}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.primary }]}>
              {roadmap ? '✨ Tailored by Gemini AI' : '9 Modules Available'}
            </Text>
          </View>
        </View>

        {orderedModules.map((mod, index) => {
          const modProgress = modulesProgress[mod.id];
          const completedCount = modProgress ? modProgress.completedTopics.length : 0;
          const priorityBadge = roadmap
            ? index === 0
              ? 'AI Priority #1 • Recommended Start'
              : `AI Priority #${index + 1}`
            : undefined;

          return (
            <LessonCard
              key={mod.id}
              module={mod}
              aiPriorityBadge={priorityBadge}
              completedTopicsCount={completedCount}
              onPress={() => {
                router.push({
                  pathname: '/ai-learn/lesson',
                  params: {
                    moduleId: mod.id,
                    topic: mod.topics[0],
                  },
                });
              }}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  topBarTitle: {
    ...typography.h3,
    fontSize: 19,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  assessmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.bodyStrong,
  },
  bannerSub: {
    ...typography.caption,
    marginTop: 2,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  quickButtonText: {
    ...typography.bodyStrong,
    color: '#FFFFFF',
    fontSize: 14,
  },
  quickButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  quickButtonTextSecondary: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  roadmapCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.lg,
  },
  roadmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  aiPillText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  regenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  regenText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  roadmapMessage: {
    ...typography.body,
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  quickWinsContainer: {
    marginTop: spacing.sm + 2,
    paddingTop: spacing.xs,
  },
  quickWinsLabel: {
    ...typography.caption,
    fontWeight: '700',
    marginBottom: 6,
  },
  quickWinsList: {
    gap: 6,
  },
  winRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.md,
    borderWidth: 1,
    width: '100%',
  },
  winText: {
    ...typography.body,
    fontSize: 12.5,
    lineHeight: 17,
    flex: 1,
  },
});
