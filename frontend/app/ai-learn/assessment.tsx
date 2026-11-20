/**
 * ISL Skill Assessment & Onboarding Screen.
 * NEW FILE
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLearning } from '@/context/LearningContext';
import { submitAssessment, AssessmentAnswerMap } from '@/services/learningService';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { LearnerLevel } from '@/services/learningStorage';

interface Question {
  id: string;
  title: string;
  subtitle: string;
  options: { label: string; value: string; levelWeight: LearnerLevel }[];
}

const ASSESSMENT_QUESTIONS: Question[] = [
  {
    id: 'prior_experience',
    title: 'How much experience do you have with Indian Sign Language (ISL)?',
    subtitle: 'This helps us calibrate starting difficulty.',
    options: [
      { label: 'Never learned before (Complete Beginner)', value: 'none', levelWeight: 'beginner' },
      { label: 'Know a few basic greetings & letters', value: 'novice', levelWeight: 'beginner' },
      { label: 'Can hold simple everyday conversations', value: 'intermediate', levelWeight: 'intermediate' },
      { label: 'Fluent or communicating frequently with Deaf community', value: 'fluent', levelWeight: 'advanced' },
    ],
  },
  {
    id: 'fingerspelling',
    title: 'How familiar are you with the ISL two-handed alphabet system?',
    subtitle: 'ISL uses both hands for the alphabet, unlike ASL.',
    options: [
      { label: 'I do not know any fingerspelling', value: 'none', levelWeight: 'beginner' },
      { label: 'I recognize vowels and a few letters', value: 'partial', levelWeight: 'beginner' },
      { label: 'I know the full A-Z fingerspelling', value: 'full', levelWeight: 'intermediate' },
      { label: 'I can spell and read fingerspelling at conversational speed', value: 'fast', levelWeight: 'advanced' },
    ],
  },
  {
    id: 'learning_goal',
    title: 'What is your primary goal for learning ISL?',
    subtitle: 'We tailor practice scenarios around your needs.',
    options: [
      { label: 'Connecting with Deaf friends or family members', value: 'family', levelWeight: 'beginner' },
      { label: 'Professional or workplace accessibility', value: 'workplace', levelWeight: 'intermediate' },
      { label: 'Healthcare, emergency, or social service support', value: 'service', levelWeight: 'intermediate' },
      { label: 'Personal interest and language learning', value: 'curiosity', levelWeight: 'beginner' },
    ],
  },
  {
    id: 'daily_time',
    title: 'How much daily study time can you commit?',
    subtitle: 'Consistency is key for muscle memory and visual recall.',
    options: [
      { label: '5 to 10 minutes (Casual)', value: '10', levelWeight: 'beginner' },
      { label: '15 to 20 minutes (Recommended)', value: '15', levelWeight: 'intermediate' },
      { label: '30+ minutes (Intensive)', value: '30', levelWeight: 'advanced' },
    ],
  },
  {
    id: 'priority_topic',
    title: 'Which communication area should Gemini prioritize first for you?',
    subtitle: 'This directly sets the #1 module in your personalized curriculum.',
    options: [
      { label: 'Everyday Greetings & Polite Courtesies (Namaste, Hello, Thanks)', value: 'greetings', levelWeight: 'beginner' },
      { label: 'Alphabets & Numbers Fingerspelling (Two-Handed ISL System)', value: 'alphabets-numbers', levelWeight: 'beginner' },
      { label: 'Everyday Conversations & 5 Ws Questions (Who, What, Where)', value: 'conversations', levelWeight: 'intermediate' },
      { label: 'Workplace, Office Meetings & Professional Dialogues', value: 'workplace', levelWeight: 'intermediate' },
      { label: 'Healthcare, Emergency Help & Hospital Symptoms', value: 'healthcare', levelWeight: 'intermediate' },
    ],
  },
];

export default function AssessmentScreen() {
  const { colors } = useTheme();
  const { completeAssessment, updateDailyGoal } = useLearning();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswerMap>({});
  const [selectedLevels, setSelectedLevels] = useState<LearnerLevel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQ = ASSESSMENT_QUESTIONS[currentIndex];
  const isLast = currentIndex === ASSESSMENT_QUESTIONS.length - 1;

  const handleSelectOption = (value: string, levelWeight: LearnerLevel) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
    setSelectedLevels((prev) => [...prev, levelWeight]);
  };

  const handleNext = async () => {
    if (!answers[currentQ.id]) {
      Alert.alert('Please choose an option', 'Select an answer to proceed.');
      return;
    }

    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Submit assessment
      setIsSubmitting(true);
      try {
        // Compute estimated level
        const beginnerCount = selectedLevels.filter((l) => l === 'beginner').length;
        const advancedCount = selectedLevels.filter((l) => l === 'advanced').length;
        let selfReported: LearnerLevel = 'beginner';
        if (advancedCount >= 2) selfReported = 'advanced';
        else if (beginnerCount <= 1) selfReported = 'intermediate';

        const result = await submitAssessment(answers, selfReported);

        await completeAssessment({
          recommendedLevel: result.recommended_level,
          summary: result.summary,
          strengths: result.strengths,
          areasToImprove: result.areas_to_improve,
          suggestedFirstModule: result.suggested_first_module,
          personalizedMessage: result.personalized_message,
          answers,
        });

        // Set daily goal from answers if available
        const goalMinutes = parseInt(String(answers['daily_time']), 10) || 15;
        await updateDailyGoal(goalMinutes);

        Alert.alert(
          'Assessment Complete!',
          `AI Level Recommended: ${result.recommended_level.toUpperCase()}\n\n${result.personalized_message}`,
          [{ text: 'Start Learning', onPress: () => router.replace('/ai-learn') }],
        );
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to submit assessment.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress tracker */}
      <View style={styles.progressRow}>
        {ASSESSMENT_QUESTIONS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressBarSegment,
              {
                backgroundColor: i <= currentIndex ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.stepCount, { color: colors.textSecondary }]}>
        Question {currentIndex + 1} of {ASSESSMENT_QUESTIONS.length}
      </Text>

      {/* Question Header */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{currentQ.title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {currentQ.subtitle}
      </Text>

      {/* Options */}
      <View style={styles.optionsList}>
        {currentQ.options.map((opt) => {
          const isSelected = answers[currentQ.id] === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.8}
              onPress={() => handleSelectOption(opt.value, opt.levelWeight)}
              style={[
                styles.optionCard,
                {
                  backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: isSelected ? colors.primary : colors.borderStrong,
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                  },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: isSelected ? colors.primary : colors.textPrimary,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Action CTA */}
      <View style={styles.actionRow}>
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.backStepButton, { borderColor: colors.border }]}
            activeOpacity={0.85}
            onPress={() => setCurrentIndex((prev) => prev - 1)}
            disabled={isSubmitting}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
            <Text style={[styles.backStepText, { color: colors.textPrimary }]}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.primary, flex: 1 }]}
          activeOpacity={0.85}
          onPress={handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.nextButtonText}>Gemini AI is analyzing...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {isLast ? 'Build Custom Roadmap with AI' : 'Next Question'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
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
  stepCount: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.xl,
  },
  optionsList: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    ...typography.body,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
  },
  backStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  backStepText: {
    ...typography.bodyStrong,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  nextButtonText: {
    ...typography.bodyStrong,
    color: '#FFFFFF',
  },
});
