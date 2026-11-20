/**
 * Interactive ISL Quiz Screen.
 * NEW FILE
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
  fetchQuizContent,
  QuizResponseData,
  submitQuizFeedback,
  FeedbackResponseData,
} from '@/services/learningService';
import { QuizOption } from '@/components/ai-learn/QuizOption';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function QuizScreen() {
  const { colors } = useTheme();
  const { profile, completeLesson } = useLearning();
  const params = useLocalSearchParams<{ topic?: string; moduleId?: string }>();

  const topic = params.topic || 'ISL Basics';
  const moduleId = params.moduleId || 'basics';

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizResponseData | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});

  // Summary state after completing quiz
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponseData | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchQuizContent(topic, profile.level);
        if (mounted) {
          setQuiz(data);
        }
      } catch (err: any) {
        console.warn('Error loading quiz:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [topic, profile.level]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Generating quiz questions...
        </Text>
      </View>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.title, { color: colors.textPrimary, marginTop: spacing.md }]}>
          Quiz unavailable
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Back to Lesson</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQ = quiz.questions[currentIdx];
  const totalQuestions = quiz.questions.length;
  const isLast = currentIdx === totalQuestions - 1;
  const isCurrentRevealed = revealed[currentIdx] === true;
  const currentSelected = selectedAnswers[currentIdx];

  const handleSelectOption = (opt: string) => {
    if (isCurrentRevealed) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentIdx]: opt }));
  };

  const handleCheckAnswer = () => {
    if (!currentSelected) {
      Alert.alert('Select an answer', 'Please choose an option before submitting.');
      return;
    }
    setRevealed((prev) => ({ ...prev, [currentIdx]: true }));
  };

  const handleNextOrFinish = async () => {
    if (!isLast) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      // Calculate score
      let correctCount = 0;
      const wrongList: any[] = [];
      quiz.questions.forEach((q, i) => {
        const userChoice = selectedAnswers[i];
        if (userChoice === q.correct_answer) {
          correctCount++;
        } else {
          wrongList.push({
            question: q.question,
            user_answer: userChoice,
            correct_answer: q.correct_answer,
          });
        }
      });

      const scorePct = Math.round((correctCount / totalQuestions) * 100);

      setSubmittingFeedback(true);
      try {
        const fb = await submitQuizFeedback(topic, profile.level, scorePct, wrongList);
        setFeedback(fb);
        setIsCompleted(true);

        // Save progress and XP
        await completeLesson(moduleId, topic, scorePct, fb.xp_earned);
      } catch (err: any) {
        console.warn('Feedback error:', err);
      } finally {
        setSubmittingFeedback(false);
      }
    }
  };

  if (isCompleted && feedback) {
    return (
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resultHeader}>
          <Ionicons
            name={feedback.passed ? 'trophy' : 'ribbon'}
            size={60}
            color={feedback.passed ? colors.warning : colors.primary}
          />
          <Text style={[styles.resultScore, { color: colors.textPrimary }]}>
            {feedback.score_percentage}%
          </Text>
          <Text style={[styles.resultTitle, { color: feedback.passed ? colors.success : colors.warning }]}>
            {feedback.passed ? 'Quiz Passed!' : 'Keep Practicing!'}
          </Text>
          <Text style={[styles.resultMsg, { color: colors.textSecondary }]}>
            {feedback.encouraging_message}
          </Text>
        </View>

        {/* XP Badge */}
        <View style={[styles.xpCard, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
          <Ionicons name="sparkles" size={24} color={colors.primary} />
          <Text style={[styles.xpText, { color: colors.primary }]}>
            +{feedback.xp_earned} XP Earned
          </Text>
        </View>

        {/* Strengths */}
        {feedback.strengths && feedback.strengths.length > 0 && (
          <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.feedbackHeading, { color: colors.success }]}>🌟 Strengths</Text>
            {feedback.strengths.map((str, idx) => (
              <Text key={idx} style={[styles.feedbackItem, { color: colors.textPrimary }]}>
                • {str}
              </Text>
            ))}
          </View>
        )}

        {/* Revision Suggestions */}
        {feedback.revision_suggestions && feedback.revision_suggestions.length > 0 && (
          <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.feedbackHeading, { color: colors.primary }]}>
              💡 Revision Recommendations
            </Text>
            {feedback.revision_suggestions.map((sug, idx) => (
              <Text key={idx} style={[styles.feedbackItem, { color: colors.textPrimary }]}>
                • {sug}
              </Text>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionBlock}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={() => router.replace('/ai-learn')}
          >
            <Text style={styles.primaryActionText}>Back to Learning Hub</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress row */}
      <View style={styles.progressRow}>
        {quiz.questions.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressBarSegment,
              {
                backgroundColor: i <= currentIdx ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.stepCount, { color: colors.textSecondary }]}>
          Question {currentIdx + 1} of {totalQuestions}
        </Text>
        <Text style={[styles.difficultyBadge, { color: colors.primary }]}>
          {currentQ.difficulty.toUpperCase()}
        </Text>
      </View>

      {/* Question */}
      <Text style={[styles.questionText, { color: colors.textPrimary }]}>{currentQ.question}</Text>

      {/* Hint toggle */}
      {currentQ.hint ? (
        <View style={styles.hintContainer}>
          <TouchableOpacity
            onPress={() => setShowHint((prev) => ({ ...prev, [currentIdx]: !prev[currentIdx] }))}
            style={styles.hintButton}
          >
            <Ionicons name="bulb-outline" size={16} color={colors.warning} />
            <Text style={[styles.hintBtnText, { color: colors.warning }]}>
              {showHint[currentIdx] ? 'Hide Hint' : 'Need a Hint?'}
            </Text>
          </TouchableOpacity>
          {showHint[currentIdx] && (
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              💡 {currentQ.hint}
            </Text>
          )}
        </View>
      ) : null}

      {/* Options List */}
      <View style={styles.optionsArea}>
        {currentQ.options.map((opt, i) => (
          <QuizOption
            key={i}
            text={opt}
            index={i}
            isSelected={currentSelected === opt}
            isCorrect={
              isCurrentRevealed
                ? opt === currentQ.correct_answer
                  ? true
                  : currentSelected === opt
                  ? false
                  : null
                : null
            }
            isAnswerRevealed={isCurrentRevealed}
            onPress={() => handleSelectOption(opt)}
            disabled={isCurrentRevealed}
          />
        ))}
      </View>

      {/* Explanation reveal */}
      {isCurrentRevealed && (
        <View
          style={[
            styles.explanationBox,
            {
              backgroundColor:
                currentSelected === currentQ.correct_answer
                  ? `${colors.success}15`
                  : `${colors.error}15`,
              borderColor:
                currentSelected === currentQ.correct_answer ? colors.success : colors.error,
            },
          ]}
        >
          <Text
            style={[
              styles.explanationTitle,
              {
                color:
                  currentSelected === currentQ.correct_answer ? colors.success : colors.error,
              },
            ]}
          >
            {currentSelected === currentQ.correct_answer ? 'Correct!' : 'Incorrect'}
          </Text>
          <Text style={[styles.explanationText, { color: colors.textPrimary }]}>
            {currentQ.explanation}
          </Text>
        </View>
      )}

      {/* Action CTA */}
      <View style={styles.bottomCta}>
        {!isCurrentRevealed ? (
          <TouchableOpacity
            style={[styles.checkButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={handleCheckAnswer}
          >
            <Text style={styles.checkButtonText}>Check Answer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.checkButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={handleNextOrFinish}
            disabled={submittingFeedback}
          >
            {submittingFeedback ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.checkButtonText}>
                  {isLast ? 'Complete Quiz & View Score' : 'Next Question'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
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
  backBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  title: {
    ...typography.h2,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  progressBarSegment: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepCount: {
    ...typography.caption,
  },
  difficultyBadge: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  questionText: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  hintContainer: {
    marginBottom: spacing.md,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintBtnText: {
    ...typography.caption,
    fontWeight: '600',
  },
  hintText: {
    ...typography.caption,
    marginTop: 4,
    fontStyle: 'italic',
  },
  optionsArea: {
    marginVertical: spacing.sm,
  },
  explanationBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginVertical: spacing.md,
  },
  explanationTitle: {
    ...typography.bodyStrong,
    marginBottom: 4,
  },
  explanationText: {
    ...typography.body,
  },
  bottomCta: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  checkButtonText: {
    ...typography.bodyStrong,
    color: '#FFFFFF',
  },
  resultHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  resultScore: {
    ...typography.display,
    marginVertical: spacing.xs,
  },
  resultTitle: {
    ...typography.h2,
    fontWeight: '700',
  },
  resultMsg: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  xpText: {
    ...typography.h3,
    fontWeight: '700',
  },
  feedbackCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  feedbackHeading: {
    ...typography.bodyStrong,
    marginBottom: spacing.xs,
  },
  feedbackItem: {
    ...typography.body,
    marginVertical: 2,
  },
  actionBlock: {
    marginTop: spacing.lg,
  },
  primaryActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  primaryActionText: {
    ...typography.bodyStrong,
    color: '#FFFFFF',
  },
});
