/**
 * Service to communicate with the AI Learning backend endpoints.
 * NEW FILE — calls production backend https://abhivyakti-backend-486350221693.asia-south1.run.app
 * Features automatic fallback for offline resilience.
 */
import Constants from 'expo-constants';
import { LearnerLevel, RoadmapResponseData, RoadmapModuleItem } from './learningStorage';

let localKey = '';
try {
  // @ts-ignore — local gitignored runtime key
  const { GEMINI_RUNTIME_KEY } = require('./geminiConfig');
  localKey = GEMINI_RUNTIME_KEY || '';
} catch (e) {
  // ignored
}

const BASE_URL = 'https://abhivyakti-backend-486350221693.asia-south1.run.app';
const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  localKey ||
  (Constants?.expoConfig?.extra as any)?.geminiApiKey ||
  '';

// Track if Cloud Run learn endpoints are available in current session to avoid 3s connection lag
let isLearnBackendAvailable: boolean | null = null;

async function callGeminiDirect<T>(prompt: string): Promise<T> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing. Please set EXPO_PUBLIC_GEMINI_API_KEY in frontend/.env');
  }

  // Prioritize high-speed, high-quota official Gemini models to avoid 429 quota exhaustion
  const models = [
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3-flash-preview',
  ];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}`;
        // If quota exceeded on this model, immediately try next available Gemini model
        if (response.status === 429) {
          console.warn(`[learningService] ${model} hit quota limit, failing over...`);
          continue;
        }
        throw new Error(`Gemini API: ${errMsg}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Empty response from Gemini API');
      }

      const cleaned = rawText.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (err: any) {
      lastErr = err;
      console.warn(`[learningService] Error with ${model}:`, err?.message || err);
    }
  }

  throw lastErr || new Error('Failed to generate response from Gemini API');
}

export interface AssessmentAnswerMap {
  [questionId: string]: string | number;
}

export interface AssessmentResponseData {
  recommended_level: LearnerLevel;
  summary: string;
  strengths: string[];
  areas_to_improve: string[];
  suggested_first_module: string;
  personalized_message: string;
}

export interface LessonSection {
  heading: string;
  content: string;
  key_points: string[];
  example?: string;
}

export interface KeySignInfo {
  sign: string;
  meaning: string;
  usage_context: string;
  mnemonic: string;
}

export interface LessonResponseData {
  title: string;
  module: string;
  topic: string;
  level: LearnerLevel;
  duration_minutes: number;
  objectives: string[];
  introduction: string;
  sections: LessonSection[];
  key_signs: KeySignInfo[];
  practice_activities: string[];
  summary: string;
  next_topic_hint: string;
  scene_prompt?: string;
}

export interface QuizQuestionItem {
  id: string;
  question: string;
  type: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  hint: string;
  difficulty: string;
}

export interface QuizResponseData {
  topic: string;
  level: LearnerLevel;
  difficulty: string;
  passing_score: number;
  questions: QuizQuestionItem[];
}

export interface FeedbackResponseData {
  score_percentage: number;
  passed: boolean;
  encouraging_message: string;
  strengths: string[];
  weak_areas: string[];
  revision_suggestions: string[];
  next_recommended_topic: string;
  xp_earned: number;
}

export interface ScenarioImageResponseData {
  image_base64: string | null;
  image_url: string | null;
  topic: string;
  scene_description: string;
  generation_note: string;
}

export interface ISLModuleDef {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  topics: string[];
  icon: string;
}

export const ISL_MODULE_CATALOG: ISLModuleDef[] = [
  {
    id: 'basics',
    title: '1. ISL Basics & Introduction',
    description: 'Foundations of visual language, signing space, body language, and facial expressions',
    estimatedMinutes: 25,
    icon: 'hand-left',
    topics: ['Signing Space & Posture', 'Facial Expressions in Grammar', 'Gaining Attention & Courtesy'],
  },
  {
    id: 'alphabets-numbers',
    title: '2. Alphabets & Numbers',
    description: 'ISL two-handed fingerspelling system and cardinal numbering',
    estimatedMinutes: 35,
    icon: 'text',
    topics: ['Fingerspelling A to M', 'Fingerspelling N to Z', 'Numbers 1 to 20', 'Counting to 100'],
  },
  {
    id: 'greetings',
    title: '3. Everyday Greetings',
    description: 'Namaste, Hello, Good Morning, Thank You, and essential social pleasantries',
    estimatedMinutes: 20,
    icon: 'chatbubble-ellipses',
    topics: ['Namaste & Good Morning', 'Polite Courtesies & Thank You', 'How Are You & Replies'],
  },
  {
    id: 'family',
    title: '4. Family & Relationships',
    description: 'Signs for parents, siblings, relatives, friends, and marital terms',
    estimatedMinutes: 30,
    icon: 'people',
    topics: ['Parents & Siblings', 'Grandparents & Relatives', 'Friends & Community'],
  },
  {
    id: 'conversations',
    title: '5. Common Conversations',
    description: 'Asking questions (Who, What, Where, When, Why), daily routines, and directions',
    estimatedMinutes: 40,
    icon: 'chatbubbles',
    topics: ['Question Words (5 Ws)', 'Giving & Asking Directions', 'Everyday Routines'],
  },
  {
    id: 'education',
    title: '6. Education & Classroom Communication',
    description: 'School, college, subjects, teacher interactions, and stationery items',
    estimatedMinutes: 35,
    icon: 'school',
    topics: ['Classroom Objects & Tools', 'Subjects & Learning Activities', 'Teacher & Student Queries'],
  },
  {
    id: 'healthcare',
    title: '7. Healthcare & Emergency Communication',
    description: 'Expressing pain, medical symptoms, emergency signs, and hospital visits',
    estimatedMinutes: 35,
    icon: 'medkit',
    topics: ['Medical Emergencies & Help', 'Describing Pain & Illness', 'Doctor Consultations & Medicines'],
  },
  {
    id: 'workplace',
    title: '8. Workplace Communication',
    description: 'Professional greetings, meetings, project terms, and workplace etiquette',
    estimatedMinutes: 30,
    icon: 'briefcase',
    topics: ['Workplace Greetings & Introductions', 'Meetings & Deadlines', 'Office Tools & Collaboration'],
  },
  {
    id: 'advanced',
    title: '9. Advanced Vocabulary & Sentence Formation',
    description: 'Grammar structures, temporal markers (past, present, future), and fluid signing',
    estimatedMinutes: 45,
    icon: 'sparkles',
    topics: ['Temporal Signs (Yesterday, Today, Tomorrow)', 'ISL Syntax & Topic-Comment Order', 'Complex Visual Storytelling'],
  },
];

async function postToBackend<T>(endpoint: string, payload: any, token?: string): Promise<T> {
  if (isLearnBackendAvailable === false) {
    throw new Error('Backend learn endpoints offline');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        isLearnBackendAvailable = false;
      }
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    isLearnBackendAvailable = true;
    const resJson = await response.json();
    return (resJson.data ?? resJson) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (isLearnBackendAvailable === null) {
      isLearnBackendAvailable = false;
    }
    throw err;
  }
}

export async function submitAssessment(
  answers: AssessmentAnswerMap,
  selfReportedLevel?: LearnerLevel,
  token?: string,
): Promise<AssessmentResponseData> {
  try {
    return await postToBackend<AssessmentResponseData>(
      '/api/v1/learn/assessment',
      { answers, self_reported_level: selfReportedLevel },
      token,
    );
  } catch (err) {
    // --- OFFLINE FALLBACK (commented out per user request — using live Gemini API) ---
    // console.warn('[learningService] submitAssessment fallback:', err);
    // return {
    //   recommended_level: selfReportedLevel || 'beginner',
    //   summary: 'Welcome to your tailored ISL learning adventure in Abhivyakti.',
    //   strengths: ['High enthusiasm for accessible communication'],
    //   areas_to_improve: ['Fingerspelling dexterity and common phrases'],
    //   suggested_first_module: 'ISL Basics & Introduction',
    //   personalized_message: 'Namaste! We are thrilled to guide you step-by-step through verified Indian Sign Language.',
    // };
    // ---------------------------------------------------------------------------------

    // Cloud Run backend returned 404/unavailable -> call Gemini directly with user's API key
    console.log('[learningService] Backend unavailable (HTTP 404), generating assessment via live Gemini API...');
    const prompt = `
You are an expert Indian Sign Language (ISL) learning tutor in the Abhivyakti app.

STRICT RULES:
1. Only teach ISL based on verified, commonly accepted Indian Sign Language standards.
2. NEVER invent or guess hand configurations, gestures, or signs.
3. NEVER describe how to perform a specific hand sign (finger positions, palm orientation).
4. Focus on: meaning, usage context, learning tips, mnemonics, cultural notes, practice scenarios.
5. Always respond in valid JSON matching the requested schema.

Self-reported level: ${selfReportedLevel || 'not provided'}
Assessment answers: ${JSON.stringify(answers, null, 2)}

Return ONLY valid JSON matching this schema (no markdown fences):
{
  "recommended_level": "beginner" | "intermediate" | "advanced",
  "summary": "2-sentence summary of the learner's current ISL knowledge",
  "strengths": ["strength 1", "strength 2"],
  "areas_to_improve": ["area 1", "area 2"],
  "suggested_first_module": "one of the 9 ISL modules",
  "personalized_message": "warm, encouraging welcome message (2-3 sentences)"
}
`;
    return await callGeminiDirect<AssessmentResponseData>(prompt);
  }
}

export async function fetchLessonContent(
  moduleId: string,
  topic: string,
  level: LearnerLevel,
  token?: string,
): Promise<LessonResponseData> {
  try {
    return await postToBackend<LessonResponseData>(
      '/api/v1/learn/lesson',
      {
        module_id: moduleId,
        topic,
        level,
        lesson_type: 'introduction',
        weak_topics: [],
        completed_topics: [],
        language: 'en',
      },
      token,
    );
  } catch (err) {
    // --- OFFLINE FALLBACK (commented out per user request — using live Gemini API) ---
    // console.warn('[learningService] fetchLessonContent fallback:', err);
    // return {
    //   title: `${topic} in ISL`,
    //   module: moduleId,
    //   topic,
    //   level,
    //   duration_minutes: 10,
    //   objectives: [
    //     `Understand the communicative purpose of ${topic}`,
    //     'Learn the practical context and visual etiquette',
    //     'Review standard practices for expressing this concept',
    //   ],
    //   introduction: `This lesson covers the fundamentals of ${topic} within Indian Sign Language.`,
    //   sections: [{ heading: 'Visual Etiquette & Signing Space', content: '...', key_points: [], example: '' }],
    //   key_signs: [{ sign: topic, meaning: `Standard expression for ${topic}`, usage_context: 'Common social and daily interactions', mnemonic: 'Refer to the verified visual demonstration in Abhivyakti for precise hand movements.' }],
    //   practice_activities: ['Mirror practice.', 'Pair practice.'],
    //   summary: `You have completed the introductory concept for ${topic}. Keep up the great visual practice!`,
    //   next_topic_hint: 'Test your understanding with a short 3-question quiz.',
    //   scene_prompt: `Friendly educational setting in India illustrating ${topic}.`,
    // };
    // ---------------------------------------------------------------------------------

    console.log('[learningService] Backend unavailable (HTTP 404), generating lesson via live Gemini API...');
    const prompt = `
You are an expert Indian Sign Language (ISL) learning tutor in the Abhivyakti app.

STRICT RULES:
1. Only teach ISL based on verified Indian Sign Language standards.
2. NEVER invent or guess hand configurations, gestures, or signs.
3. For any hand demonstration, say "Refer to the visual demonstration in the app".
4. Return ONLY valid JSON matching this exact schema:
{
  "title": "Introduction to ${topic}",
  "module": "${moduleId}",
  "topic": "${topic}",
  "level": "${level}",
  "duration_minutes": 10,
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "introduction": "Engaging 2-3 sentence introduction to the topic",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Section explanation. For any sign demonstration, say 'See the visual in the app'.",
      "key_points": ["point 1", "point 2"],
      "example": "A practical usage example or sentence"
    }
  ],
  "key_signs": [
    {
      "sign": "${topic}",
      "meaning": "What it means",
      "usage_context": "When/how it is used",
      "mnemonic": "Memory tip"
    }
  ],
  "practice_activities": [
    "Activity 1 description",
    "Activity 2 description"
  ],
  "summary": "2-sentence lesson summary",
  "next_topic_hint": "What to study next",
  "scene_prompt": "A one-sentence description of an everyday scene illustrating this topic (NO hand signs)"
}
`;
    const res = await callGeminiDirect<LessonResponseData>(prompt);
    return {
      title: res.title || `${topic} in ISL`,
      module: res.module || moduleId,
      topic: res.topic || topic,
      level: res.level || level,
      duration_minutes: res.duration_minutes || 10,
      objectives:
        res.objectives && res.objectives.length > 0
          ? res.objectives
          : [`Understand communicative purpose of ${topic}`, 'Observe standard ISL visual etiquette'],
      introduction: res.introduction || `This lesson covers essential fundamentals of ${topic} in Indian Sign Language.`,
      sections:
        res.sections && res.sections.length > 0
          ? res.sections
          : [
              {
                heading: 'Visual Etiquette & Context',
                content: `In Indian Sign Language, ${topic} relies on spatial awareness and facial expression. Refer to the visual demonstration in the app for exact hand configurations.`,
                key_points: ['Maintain comfortable signing space', 'Incorporate natural facial grammar'],
                example: 'Common daily interaction',
              },
            ],
      key_signs: res.key_signs || [],
      practice_activities:
        res.practice_activities && res.practice_activities.length > 0
          ? res.practice_activities
          : ['Practice in front of a mirror', 'Verify your sign in the Abhivyakti visual model'],
      summary: res.summary || `You have completed the key learning points for ${topic}.`,
      next_topic_hint: res.next_topic_hint || 'Test your understanding with a short mastery quiz.',
      scene_prompt: res.scene_prompt,
    };
  }
}

export async function fetchQuizContent(
  topic: string,
  level: LearnerLevel,
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  numQuestions: number = 3,
  token?: string,
): Promise<QuizResponseData> {
  try {
    return await postToBackend<QuizResponseData>(
      '/api/v1/learn/quiz',
      { topic, level, difficulty, num_questions: numQuestions },
      token,
    );
  } catch (err) {
    // --- OFFLINE FALLBACK (commented out per user request — using live Gemini API) ---
    // console.warn('[learningService] fetchQuizContent fallback:', err);
    // return {
    //   topic,
    //   level,
    //   difficulty,
    //   passing_score: 70,
    //   questions: [ ... ],
    // };
    // ---------------------------------------------------------------------------------

    console.log('[learningService] Backend unavailable (HTTP 404), generating quiz via live Gemini API...');
    const prompt = `
You are an expert Indian Sign Language (ISL) tutor in the Abhivyakti app.

Generate an ISL quiz for the Abhivyakti learning app.
Topic: ${topic}
Level: ${level}
Difficulty: ${difficulty}
Number of questions: ${numQuestions}

IMPORTANT: Questions must be about ISL meaning, usage, context, vocabulary — NOT about hand positions or gestures.

Return ONLY valid JSON matching this schema:
{
  "topic": "${topic}",
  "level": "${level}",
  "difficulty": "${difficulty}",
  "passing_score": 70,
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Why this is correct",
      "hint": "A helpful hint before revealing the answer",
      "difficulty": "${difficulty}"
    }
  ]
}
`;
    return await callGeminiDirect<QuizResponseData>(prompt);
  }
}

export async function submitQuizFeedback(
  topic: string,
  level: LearnerLevel,
  scorePercentage: number,
  wrongAnswers: any[] = [],
  timeTakenSeconds?: number,
  token?: string,
): Promise<FeedbackResponseData> {
  try {
    return await postToBackend<FeedbackResponseData>(
      '/api/v1/learn/feedback',
      {
        topic,
        level,
        quiz_score: scorePercentage,
        wrong_answers: wrongAnswers,
        time_taken_seconds: timeTakenSeconds,
      },
      token,
    );
  } catch (err) {
    // --- OFFLINE FALLBACK (commented out per user request — using live Gemini API) ---
    // console.warn('[learningService] submitQuizFeedback fallback:', err);
    // const passed = scorePercentage >= 70;
    // return { ... };
    // ---------------------------------------------------------------------------------

    console.log('[learningService] Backend unavailable (HTTP 404), generating feedback via live Gemini API...');
    const prompt = `
You are an expert Indian Sign Language (ISL) tutor in the Abhivyakti app.

A learner just completed an ISL quiz. Generate personalised feedback.
Topic: ${topic}
Level: ${level}
Score: ${scorePercentage}%
Wrong answers: ${JSON.stringify(wrongAnswers, null, 2)}
Time taken: ${timeTakenSeconds || 'not recorded'} seconds

Return ONLY valid JSON matching this schema:
{
  "score_percentage": ${scorePercentage},
  "passed": ${scorePercentage >= 70},
  "encouraging_message": "2-3 sentence personalised feedback message",
  "strengths": ["What they did well"],
  "weak_areas": ["Areas needing more practice"],
  "revision_suggestions": ["Specific revision activity 1", "Specific revision activity 2"],
  "next_recommended_topic": "The most logical next topic",
  "xp_earned": ${Math.max(10, Math.min(100, Math.round(scorePercentage * 0.8 + (scorePercentage >= 70 ? 20 : 10))))}
}
`;
    return await callGeminiDirect<FeedbackResponseData>(prompt);
  }
}

export async function fetchScenarioImage(
  topic: string,
  sceneDescription: string,
  token?: string,
): Promise<ScenarioImageResponseData> {
  try {
    return await postToBackend<ScenarioImageResponseData>(
      '/api/v1/learn/image',
      { topic, scene_description: sceneDescription },
      token,
    );
  } catch (err) {
    return {
      image_base64: null,
      image_url: null,
      topic,
      scene_description: sceneDescription,
      generation_note: 'Image illustration offline',
    };
  }
}

export async function fetchRoadmapContent(
  level: LearnerLevel,
  weakTopics: string[] = [],
  completedModules: string[] = [],
  dailyGoalMinutes: number = 15,
  userPreferences?: Record<string, any>,
  token?: string,
): Promise<RoadmapResponseData> {
  try {
    return await postToBackend<RoadmapResponseData>(
      '/api/v1/learn/roadmap',
      {
        level,
        weak_topics: weakTopics,
        completed_modules: completedModules,
        daily_goal_minutes: dailyGoalMinutes,
        user_preferences: userPreferences,
      },
      token,
    );
  } catch (err) {
    // --- OFFLINE FALLBACK (commented out per user request — using live Gemini API) ---
    // console.warn('[learningService] fetchRoadmapContent fallback:', err);
    // return { ... };
    // ---------------------------------------------------------------------------------

    console.log('[learningService] Generating personalized roadmap via live Gemini API with user answers...');
    interface CompactRoadmapGeminiResponse {
      level?: LearnerLevel;
      estimated_total_hours?: number;
      daily_goal_minutes?: number;
      personalized_message?: string;
      quick_wins?: string[];
      module_priorities?: Array<{
        id: string;
        priority: number;
        reason?: string;
      }>;
    }

    const prompt = `
You are an expert Indian Sign Language (ISL) learning tutor in the Abhivyakti app.

A learner personalized their ISL Roadmap with these specific answers:
- Learner Level Evaluated: ${level}
- Prior ISL Experience: ${userPreferences?.prior_experience || 'none'}
- Fingerspelling Familiarity: ${userPreferences?.fingerspelling || 'none'}
- Primary Learning Goal: ${userPreferences?.learning_goal || 'general communication'}
- Priority Topic Selected: ${userPreferences?.priority_topic || 'basics'}
- Daily Commitment: ${dailyGoalMinutes} minutes
- Areas Needing Focus: ${JSON.stringify(weakTopics)}

Based strictly on this user's specific answers, assign priority 1 (highest) to 9 for the 9 modules:
- basics
- alphabets-numbers
- greetings
- family
- conversations
- education
- healthcare
- workplace
- advanced

Elevate the module matching their Priority Topic and Learning Goal to Priority 1.

Return ONLY valid JSON matching this schema (no markdown fences):
{
  "level": "${level}",
  "estimated_total_hours": 6.5,
  "daily_goal_minutes": ${dailyGoalMinutes},
  "personalized_message": "2-3 sentences explaining exactly how this roadmap is tailored to their answers (${userPreferences?.learning_goal || ''}, ${userPreferences?.priority_topic || ''}).",
  "quick_wins": ["Milestone 1 directly aligned with their goal", "Milestone 2"],
  "module_priorities": [
    { "id": "module_id", "priority": 1, "reason": "Why prioritized based on their goal" }
  ]
}
`;
    const res = await callGeminiDirect<CompactRoadmapGeminiResponse>(prompt);

    // Merge priorities with local ISL_MODULE_CATALOG for instant fast generation & rich metadata
    const priorityMap = new Map((res.module_priorities || []).map((p) => [p.id, p]));
    const fullModules: RoadmapModuleItem[] = ISL_MODULE_CATALOG.map((cat, idx) => {
      const pInfo = priorityMap.get(cat.id);
      return {
        id: cat.id,
        title: cat.title,
        description: pInfo?.reason || cat.description,
        estimated_duration_minutes: cat.estimatedMinutes,
        topics: cat.topics,
        priority: pInfo ? pInfo.priority : idx + 1,
        icon: cat.icon,
      };
    });
    fullModules.sort((a, b) => a.priority - b.priority);

    return {
      level: res.level || level,
      total_modules: fullModules.length,
      estimated_total_hours: res.estimated_total_hours || 6.5,
      daily_goal_minutes: res.daily_goal_minutes || dailyGoalMinutes,
      personalized_message:
        res.personalized_message ||
        'Your personalized Indian Sign Language curriculum is tailored to your learning goals.',
      quick_wins: res.quick_wins || ['Start with your recommended priority module', 'Dedicate 15 mins daily'],
      modules: fullModules,
      generatedAt: new Date().toISOString(),
    };
  }
}
