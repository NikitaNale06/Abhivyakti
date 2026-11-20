/**
 * Storage management for AI Learning module using AsyncStorage.
 * NEW FILE — strictly uses '@abhivyakti/ai_*' keys to avoid any collision.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LearnerLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearnerProfile {
  level: LearnerLevel;
  totalXP: number;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  dailyGoalMinutes: number;
  assessmentCompleted: boolean;
  onboardingResult?: {
    recommendedLevel: LearnerLevel;
    summary: string;
    strengths: string[];
    areasToImprove: string[];
    suggestedFirstModule: string;
    personalizedMessage: string;
    completedAt: string;
  };
}

export interface ModuleProgress {
  moduleId: string;
  completedTopics: string[];
  totalTopics: number;
  lastScore?: number;
  isCompleted: boolean;
  updatedAt: string;
}

export interface LessonHistoryItem {
  id: string;
  moduleId: string;
  topic: string;
  completedAt: string;
  score?: number;
  xpEarned: number;
}

export interface AIStats {
  lessonsCompleted: number;
  quizzesTaken: number;
  averageQuizScore: number;
  weakTopics: string[];
}

export interface RoadmapModuleItem {
  id: string;
  title: string;
  description: string;
  estimated_duration_minutes: number;
  topics: string[];
  priority: number;
  icon?: string;
}

export interface RoadmapResponseData {
  level: LearnerLevel;
  total_modules: number;
  estimated_total_hours: number;
  daily_goal_minutes: number;
  personalized_message: string;
  quick_wins: string[];
  modules: RoadmapModuleItem[];
  generatedAt?: string;
}

const STORAGE_KEYS = {
  PROFILE: '@abhivyakti/ai_profile',
  PROGRESS: '@abhivyakti/ai_progress',
  HISTORY: '@abhivyakti/ai_history',
  STATS: '@abhivyakti/ai_stats',
  ROADMAP: '@abhivyakti/ai_roadmap',
};

const DEFAULT_PROFILE: LearnerProfile = {
  level: 'beginner',
  totalXP: 0,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  dailyGoalMinutes: 15,
  assessmentCompleted: false,
};

const DEFAULT_STATS: AIStats = {
  lessonsCompleted: 0,
  quizzesTaken: 0,
  averageQuizScore: 0,
  weakTopics: [],
};

export async function loadLearnerProfile(): Promise<LearnerProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('[AI Learning Storage] Error reading profile:', err);
    return DEFAULT_PROFILE;
  }
}

export async function saveLearnerProfile(profile: LearnerProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.warn('[AI Learning Storage] Error saving profile:', err);
  }
}

export async function loadModulesProgress(): Promise<Record<string, ModuleProgress>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('[AI Learning Storage] Error reading progress:', err);
    return {};
  }
}

export async function saveModulesProgress(progress: Record<string, ModuleProgress>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch (err) {
    console.warn('[AI Learning Storage] Error saving progress:', err);
  }
}

export async function loadLessonHistory(): Promise<LessonHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[AI Learning Storage] Error reading history:', err);
    return [];
  }
}

export async function appendLessonHistory(item: LessonHistoryItem): Promise<void> {
  try {
    const history = await loadLessonHistory();
    const updated = [item, ...history].slice(0, 50); // keep last 50
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[AI Learning Storage] Error appending history:', err);
  }
}

export async function loadAIStats(): Promise<AIStats> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return DEFAULT_STATS;
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('[AI Learning Storage] Error reading stats:', err);
    return DEFAULT_STATS;
  }
}

export async function saveAIStats(stats: AIStats): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (err) {
    console.warn('[AI Learning Storage] Error saving stats:', err);
  }
}

export async function checkAndUpdateStreak(profile: LearnerProfile): Promise<LearnerProfile> {
  const today = new Date().toISOString().split('T')[0];
  const lastActive = profile.lastActiveDate;

  if (lastActive === today) {
    return profile;
  }

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  let newStreak = profile.streakDays;
  if (lastActive === yesterday) {
    newStreak += 1;
  } else {
    newStreak = 1; // streak reset
  }

  const updatedProfile: LearnerProfile = {
    ...profile,
    streakDays: newStreak,
    lastActiveDate: today,
  };

  await saveLearnerProfile(updatedProfile);
  return updatedProfile;
}

export async function loadPersonalizedRoadmap(): Promise<RoadmapResponseData | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ROADMAP);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[AI Learning Storage] Error loading roadmap:', err);
    return null;
  }
}

export async function savePersonalizedRoadmap(roadmap: RoadmapResponseData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ROADMAP, JSON.stringify(roadmap));
  } catch (err) {
    console.warn('[AI Learning Storage] Error saving roadmap:', err);
  }
}
