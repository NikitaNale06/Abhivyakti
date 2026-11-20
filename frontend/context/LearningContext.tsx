/**
 * React Context for AI-Powered ISL Learning Module.
 * NEW FILE — strictly manages '@abhivyakti/ai_*' state.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  LearnerProfile,
  ModuleProgress,
  LessonHistoryItem,
  AIStats,
  loadLearnerProfile,
  saveLearnerProfile,
  loadModulesProgress,
  saveModulesProgress,
  loadLessonHistory,
  appendLessonHistory,
  loadAIStats,
  saveAIStats,
  checkAndUpdateStreak,
  LearnerLevel,
  RoadmapResponseData,
  loadPersonalizedRoadmap,
  savePersonalizedRoadmap,
} from '@/services/learningStorage';
import { ISL_MODULE_CATALOG, fetchRoadmapContent } from '@/services/learningService';

interface LearningContextValue {
  profile: LearnerProfile;
  modulesProgress: Record<string, ModuleProgress>;
  history: LessonHistoryItem[];
  stats: AIStats;
  roadmap: RoadmapResponseData | null;
  isGeneratingRoadmap: boolean;
  isLoading: boolean;
  completeAssessment: (data: {
    recommendedLevel: LearnerLevel;
    summary: string;
    strengths: string[];
    areasToImprove: string[];
    suggestedFirstModule: string;
    personalizedMessage: string;
    answers?: Record<string, any>;
  }) => Promise<void>;
  generateRoadmap: (forceRefresh?: boolean) => Promise<RoadmapResponseData>;
  completeLesson: (
    moduleId: string,
    topic: string,
    score?: number,
    xpEarned?: number,
  ) => Promise<void>;
  updateDailyGoal: (minutes: number) => Promise<void>;
  resetAllLearningData: () => Promise<void>;
  refreshLearningState: () => Promise<void>;
}

const LearningContext = createContext<LearningContextValue | undefined>(undefined);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LearnerProfile>({
    level: 'beginner',
    totalXP: 0,
    streakDays: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    dailyGoalMinutes: 15,
    assessmentCompleted: false,
  });
  const [modulesProgress, setModulesProgress] = useState<Record<string, ModuleProgress>>({});
  const [history, setHistory] = useState<LessonHistoryItem[]>([]);
  const [stats, setStats] = useState<AIStats>({
    lessonsCompleted: 0,
    quizzesTaken: 0,
    averageQuizScore: 0,
    weakTopics: [],
  });
  const [roadmap, setRoadmap] = useState<RoadmapResponseData | null>(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const generateRoadmap = async (forceRefresh: boolean = false): Promise<RoadmapResponseData> => {
    if (!forceRefresh && roadmap) {
      return roadmap;
    }
    setIsGeneratingRoadmap(true);
    try {
      const completedModIds = Object.keys(modulesProgress).filter(
        (id) => modulesProgress[id]?.isCompleted,
      );
      const newRoadmap = await fetchRoadmapContent(
        profile.level,
        stats.weakTopics,
        completedModIds,
        profile.dailyGoalMinutes,
      );
      setRoadmap(newRoadmap);
      await savePersonalizedRoadmap(newRoadmap);
      return newRoadmap;
    } catch (err) {
      console.error('[LearningProvider] Error generating roadmap:', err);
      throw err;
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const initData = async () => {
    try {
      const [savedProfile, savedProgress, savedHistory, savedStats, savedRoadmap] = await Promise.all([
        loadLearnerProfile(),
        loadModulesProgress(),
        loadLessonHistory(),
        loadAIStats(),
        loadPersonalizedRoadmap(),
      ]);

      const updatedProfile = await checkAndUpdateStreak(savedProfile);
      setProfile(updatedProfile);
      setModulesProgress(savedProgress);
      setHistory(savedHistory);
      setStats(savedStats);
      setRoadmap(savedRoadmap);
    } catch (err) {
      console.warn('[LearningProvider] Init error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const completeAssessment = async (data: {
    recommendedLevel: LearnerLevel;
    summary: string;
    strengths: string[];
    areasToImprove: string[];
    suggestedFirstModule: string;
    personalizedMessage: string;
    answers?: Record<string, any>;
  }) => {
    const updated: LearnerProfile = {
      ...profile,
      level: data.recommendedLevel,
      assessmentCompleted: true,
      onboardingResult: {
        ...data,
        completedAt: new Date().toISOString(),
      },
    };
    setProfile(updated);
    await saveLearnerProfile(updated);

    // Immediately generate personalized roadmap for the user's new level via Gemini using their exact answers
    try {
      setIsGeneratingRoadmap(true);
      const newRoadmap = await fetchRoadmapContent(
        data.recommendedLevel,
        data.areasToImprove,
        [],
        profile.dailyGoalMinutes,
        data.answers,
      );
      setRoadmap(newRoadmap);
      await savePersonalizedRoadmap(newRoadmap);
    } catch (err) {
      console.warn('[LearningProvider] Roadmap generation post-assessment error:', err);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const completeLesson = async (
    moduleId: string,
    topic: string,
    score?: number,
    xpEarned: number = 20,
  ) => {
    // 1. Update Profile XP
    const newXP = profile.totalXP + xpEarned;
    const updatedProfile: LearnerProfile = {
      ...profile,
      totalXP: newXP,
      lastActiveDate: new Date().toISOString().split('T')[0],
    };
    setProfile(updatedProfile);
    await saveLearnerProfile(updatedProfile);

    // 2. Update Module Progress
    const catalogModule = ISL_MODULE_CATALOG.find((m) => m.id === moduleId);
    const totalTopicsInMod = catalogModule ? catalogModule.topics.length : 3;
    const existing = modulesProgress[moduleId] || {
      moduleId,
      completedTopics: [],
      totalTopics: totalTopicsInMod,
      isCompleted: false,
      updatedAt: new Date().toISOString(),
    };

    const completedTopicsSet = new Set(existing.completedTopics);
    completedTopicsSet.add(topic);
    const completedTopicsArray = Array.from(completedTopicsSet);
    const isCompleted = completedTopicsArray.length >= totalTopicsInMod;

    const newProgress = {
      ...modulesProgress,
      [moduleId]: {
        ...existing,
        completedTopics: completedTopicsArray,
        totalTopics: totalTopicsInMod,
        lastScore: score !== undefined ? score : existing.lastScore,
        isCompleted,
        updatedAt: new Date().toISOString(),
      },
    };
    setModulesProgress(newProgress);
    await saveModulesProgress(newProgress);

    // 3. Append to History
    const historyItem: LessonHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      moduleId,
      topic,
      completedAt: new Date().toISOString(),
      score,
      xpEarned,
    };
    setHistory((prev) => [historyItem, ...prev].slice(0, 50));
    await appendLessonHistory(historyItem);

    // 4. Update Stats
    const totalLessons = stats.lessonsCompleted + 1;
    const quizzesTaken = score !== undefined ? stats.quizzesTaken + 1 : stats.quizzesTaken;
    const currentTotalScore = stats.averageQuizScore * stats.quizzesTaken;
    const newAvgScore =
      quizzesTaken > 0
        ? Math.round((currentTotalScore + (score || 0)) / quizzesTaken)
        : stats.averageQuizScore;

    const weakTopics = [...stats.weakTopics];
    if (score !== undefined && score < 70 && !weakTopics.includes(topic)) {
      weakTopics.push(topic);
    } else if (score !== undefined && score >= 85) {
      const idx = weakTopics.indexOf(topic);
      if (idx !== -1) weakTopics.splice(idx, 1);
    }

    const updatedStats: AIStats = {
      lessonsCompleted: totalLessons,
      quizzesTaken,
      averageQuizScore: newAvgScore,
      weakTopics,
    };
    setStats(updatedStats);
    await saveAIStats(updatedStats);
  };

  const updateDailyGoal = async (minutes: number) => {
    const updated: LearnerProfile = { ...profile, dailyGoalMinutes: minutes };
    setProfile(updated);
    await saveLearnerProfile(updated);
  };

  const resetAllLearningData = async () => {
    const freshProfile: LearnerProfile = {
      level: 'beginner',
      totalXP: 0,
      streakDays: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      dailyGoalMinutes: 15,
      assessmentCompleted: false,
    };
    setProfile(freshProfile);
    setModulesProgress({});
    setHistory([]);
    setStats({
      lessonsCompleted: 0,
      quizzesTaken: 0,
      averageQuizScore: 0,
      weakTopics: [],
    });
    await Promise.all([
      saveLearnerProfile(freshProfile),
      saveModulesProgress({}),
      saveAIStats({
        lessonsCompleted: 0,
        quizzesTaken: 0,
        averageQuizScore: 0,
        weakTopics: [],
      }),
    ]);
  };

  const value = useMemo(
    () => ({
      profile,
      modulesProgress,
      history,
      stats,
      roadmap,
      isGeneratingRoadmap,
      isLoading,
      completeAssessment,
      generateRoadmap,
      completeLesson,
      updateDailyGoal,
      resetAllLearningData,
      refreshLearningState: initData,
    }),
    [profile, modulesProgress, history, stats, roadmap, isGeneratingRoadmap, isLoading],
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error('useLearning must be used within a LearningProvider');
  }
  return context;
}
