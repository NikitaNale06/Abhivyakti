/**
 * Interactive Lesson Viewer Screen.
 * NEW FILE — strictly educational context; points to app visuals for hand signs.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLearning } from '@/context/LearningContext';
import {
  fetchLessonContent,
  LessonResponseData,
  fetchScenarioImage,
} from '@/services/learningService';
import { ScenarioImage } from '@/components/ai-learn/ScenarioImage';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function LessonScreen() {
  const { colors } = useTheme();
  const { profile, completeLesson } = useLearning();
  const params = useLocalSearchParams<{ moduleId?: string; topic?: string }>();

  const moduleId = params.moduleId || 'basics';
  const topic = params.topic || 'ISL Basics';

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<LessonResponseData | null>(null);
  const [scenarioImage, setScenarioImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadLesson = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchLessonContent(moduleId, topic, profile.level);
      setLesson(data);

      // Fetch scene image illustration
      if (data.scene_prompt) {
        fetchScenarioImage(topic, data.scene_prompt)
          .then((imgRes) => {
            if (imgRes?.image_base64) {
              setScenarioImage(imgRes.image_base64);
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      console.warn('Error loading lesson:', err);
      setErrorMsg(err?.message || 'Failed to load lesson from Gemini AI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLesson();
  }, [moduleId, topic, profile.level]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          AI tutor is tailoring your lesson with Gemini AI...
        </Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.title, { color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' }]}>
          Unable to load lesson
        </Text>
        {errorMsg ? (
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
            {errorMsg}
          </Text>
        ) : null}
        <View style={styles.errorBtnRow}>
          <TouchableOpacity
            onPress={loadLesson}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="refresh" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Retry Lesson</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Info */}
      <View style={styles.header}>
        <View style={[styles.levelTag, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.levelText, { color: colors.primary }]}>
            {lesson.level.toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.duration, { color: colors.textSecondary }]}>
          ⏱ ~{lesson.duration_minutes} mins
        </Text>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>{lesson.title}</Text>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>{lesson.introduction}</Text>

      {/* Educational Scenario Illustration */}
      <ScenarioImage
        base64Image={scenarioImage}
        caption="Educational scenario context (Visual non-verbal reference)"
        topic={topic}
      />

      {/* Objectives */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          🎯 Learning Objectives
        </Text>
        {lesson.objectives.map((obj, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.bulletText, { color: colors.textPrimary }]}>{obj}</Text>
          </View>
        ))}
      </View>

      {/* Lesson Sections */}
      {lesson.sections.map((sec, i) => (
        <View
          key={i}
          style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>{sec.heading}</Text>
          <Text style={[styles.sectionBody, { color: colors.textPrimary }]}>{sec.content}</Text>

          {sec.key_points && sec.key_points.length > 0 && (
            <View style={styles.keyPointsBox}>
              <Text style={[styles.subHeading, { color: colors.textSecondary }]}>
                Key Principles:
              </Text>
              {sec.key_points.map((pt, j) => (
                <Text key={j} style={[styles.pointItem, { color: colors.textPrimary }]}>
                  • {pt}
                </Text>
              ))}
            </View>
          )}

          {sec.example ? (
            <View
              style={[
                styles.exampleBox,
                { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.exampleTitle, { color: colors.primary }]}>💡 Example:</Text>
              <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                {sec.example}
              </Text>
            </View>
          ) : null}
        </View>
      ))}

      {/* Verified Visual Demo Notice */}
      <View
        style={[
          styles.verifiedNotice,
          { backgroundColor: colors.primarySoft, borderColor: colors.primary },
        ]}
      >
        <Ionicons name="information-circle" size={24} color={colors.primary} />
        <View style={styles.verifiedNoticeText}>
          <Text style={[styles.verifiedTitle, { color: colors.primary }]}>
            Verified ISL Visual Demonstrations
          </Text>
          <Text style={[styles.verifiedSub, { color: colors.textSecondary }]}>
            To see exact finger and hand configurations, check the verified 3D & camera recognition
            viewers in Abhivyakti.
          </Text>
        </View>
      </View>

      {/* Practice Activities */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          🤲 Hands-on Practice
        </Text>
        {lesson.practice_activities.map((act, i) => (
          <View key={i} style={styles.activityRow}>
            <View style={[styles.activityNum, { backgroundColor: colors.primarySoft }]}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{i + 1}</Text>
            </View>
            <Text style={[styles.activityText, { color: colors.textPrimary }]}>{act}</Text>
          </View>
        ))}
      </View>

      {/* Bottom CTA to Quiz */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.quizButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            // Mark lesson complete and navigate to quiz
            completeLesson(moduleId, topic, undefined, 20);
            router.push({
              pathname: '/ai-learn/quiz',
              params: { topic, moduleId },
            });
          }}
        >
          <Text style={styles.quizButtonText}>Take Mastery Quiz (+50 XP)</Text>
          <Ionicons name="trophy" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorSub: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  errorBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  backBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  levelTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  levelText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  duration: {
    ...typography.caption,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  intro: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  sectionHeading: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    ...typography.body,
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: 4,
  },
  bulletText: {
    ...typography.body,
    flex: 1,
  },
  keyPointsBox: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDD',
  },
  subHeading: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: 4,
  },
  pointItem: {
    ...typography.body,
    marginVertical: 2,
  },
  exampleBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  exampleTitle: {
    ...typography.caption,
    fontWeight: '700',
    marginBottom: 2,
  },
  exampleText: {
    ...typography.caption,
  },
  verifiedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  verifiedNoticeText: {
    flex: 1,
  },
  verifiedTitle: {
    ...typography.bodyStrong,
  },
  verifiedSub: {
    ...typography.caption,
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  activityNum: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    ...typography.body,
    flex: 1,
  },
  ctaContainer: {
    marginTop: spacing.xl,
  },
  quizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  quizButtonText: {
    ...typography.bodyStrong,
    color: '#FFFFFF',
  },
});
