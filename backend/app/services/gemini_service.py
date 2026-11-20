"""
Gemini API service for the AI-powered ISL Learning module.
NEW FILE — does not modify any existing service.

Uses:
  - gemini-2.0-flash for lesson generation, quizzes, feedback, roadmap
  - google-genai SDK (pip install google-genai)

Environment variable required:
  GEMINI_API_KEY=your_key_here
"""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Client setup & Direct API Fallback
# ---------------------------------------------------------------------------
GEMINI_MODEL = "gemini-3-flash-preview"

def _get_api_key() -> str:
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        # Check backend/.env
        env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY="):
                        key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    if not key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")
    return key


def _call_gemini(prompt: str, model: str = GEMINI_MODEL) -> str:
    """Call Gemini via google-genai SDK if available, or direct REST API."""
    key = _get_api_key()

    # 1. Try google-genai SDK first
    try:
        from google import genai  # type: ignore
        client = genai.Client(api_key=key)
        response = client.models.generate_content(
            model=model,
            contents=prompt,
        )
        return response.text
    except ImportError:
        pass

    # 2. Direct REST HTTPS call (zero dependencies, works everywhere)
    import urllib.request
    import urllib.error

    payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
    candidate_models = [model, "gemini-3-flash-preview", "gemini-flash-latest"]
    seen = set()
    last_error = None

    for candidate in candidate_models:
        if candidate in seen:
            continue
        seen.add(candidate)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{candidate}:generateContent?key={key}"
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code == 503:
                logger.warning(f"Model {candidate} temporarily unavailable (503), trying alternate...")
                continue
            raise

    if last_error:
        raise last_error
    raise RuntimeError("All Gemini candidate models failed to respond.")

# ---------------------------------------------------------------------------
# ISL Module catalogue (used in prompts so Gemini stays on-topic)
# ---------------------------------------------------------------------------
ISL_MODULES = [
    "ISL Basics & Introduction",
    "Alphabets & Numbers",
    "Everyday Greetings",
    "Family & Relationships",
    "Common Conversations",
    "Education & Classroom Communication",
    "Healthcare & Emergency Communication",
    "Workplace Communication",
    "Advanced Vocabulary & Sentence Formation",
]

SYSTEM_INSTRUCTION = """
You are an expert Indian Sign Language (ISL) learning tutor embedded in the Abhivyakti app.

STRICT RULES:
1. Only teach ISL based on verified, commonly accepted Indian Sign Language standards.
2. NEVER invent or guess hand configurations, gestures, or signs.
3. NEVER describe how to perform a specific hand sign (finger positions, palm orientation, movement).
   The app has verified 3D and photographic resources for that — your job is context, meaning, and pedagogy.
4. Focus on: meaning, usage context, learning tips, mnemonics, cultural notes, practice scenarios.
5. Always respond in valid JSON matching the requested schema.
6. Keep language simple, friendly, encouraging, and culturally appropriate for Indian learners.
7. For sign descriptions, say "Refer to the visual demonstration in the app" instead of describing hand positions.
"""


def _extract_json(text: str) -> dict[str, Any] | list[Any]:
    """Extract JSON from a Gemini response that may include markdown fences."""
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("```").strip()
    return json.loads(cleaned)


async def generate_assessment_result(answers: dict, self_reported_level: str | None) -> dict:
    """Analyse onboarding assessment answers and return a recommended learning profile."""
    prompt = f"""
{SYSTEM_INSTRUCTION}

A new Abhivyakti user just completed their ISL onboarding assessment.

Self-reported level: {self_reported_level or 'not provided'}
Assessment answers: {json.dumps(answers, indent=2)}

Based on these answers, generate a personalised learner profile.

Return ONLY valid JSON matching this schema (no markdown fences):
{{
  "recommended_level": "beginner" | "intermediate" | "advanced",
  "summary": "2-sentence summary of the learner's current ISL knowledge",
  "strengths": ["strength 1", "strength 2"],
  "areas_to_improve": ["area 1", "area 2"],
  "suggested_first_module": "one of the 9 ISL modules",
  "personalized_message": "warm, encouraging welcome message (2-3 sentences)"
}}
"""
    raw_text = _call_gemini(prompt)
    return _extract_json(raw_text)


async def generate_lesson(
    module_id: str,
    topic: str,
    level: str,
    lesson_type: str,
    weak_topics: list[str],
    completed_topics: list[str],
) -> dict:
    """Generate a full structured lesson for a given module/topic/level."""
    prompt = f"""
{SYSTEM_INSTRUCTION}

Generate a complete ISL lesson for the Abhivyakti learning app.

Module: {module_id}
Topic: {topic}
Learner Level: {level}
Lesson Type: {lesson_type}
Weak topics (personalise for these): {weak_topics}
Already completed topics (don't repeat): {completed_topics}

Return ONLY valid JSON matching this exact schema:
{{
  "title": "Lesson title",
  "module": "{module_id}",
  "topic": "{topic}",
  "level": "{level}",
  "duration_minutes": 10,
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "introduction": "Engaging 2-3 sentence introduction to the topic",
  "sections": [
    {{
      "heading": "Section heading",
      "content": "Section explanation (2-4 paragraphs). For any sign demonstration, say 'See the visual in the app'.",
      "key_points": ["point 1", "point 2"],
      "example": "A practical usage example or sentence"
    }}
  ],
  "key_signs": [
    {{
      "sign": "Sign name",
      "meaning": "What it means",
      "usage_context": "When/how it is used",
      "mnemonic": "Memory tip"
    }}
  ],
  "practice_activities": [
    "Activity 1 description",
    "Activity 2 description"
  ],
  "summary": "2-sentence lesson summary",
  "next_topic_hint": "What to study next",
  "scene_prompt": "A one-sentence description of an everyday scene that illustrates this topic (for educational illustration, NO hand signs)"
}}
"""
    raw_text = _call_gemini(prompt)
    return _extract_json(raw_text)


async def generate_quiz(
    topic: str,
    level: str,
    difficulty: str,
    num_questions: int,
    weak_topics: list[str],
) -> dict:
    """Generate an interactive quiz for a topic."""
    prompt = f"""
{SYSTEM_INSTRUCTION}

Generate an ISL quiz for the Abhivyakti learning app.

Topic: {topic}
Level: {level}
Difficulty: {difficulty}
Number of questions: {num_questions}
Weak areas to target: {weak_topics}

IMPORTANT: Questions must be about ISL meaning, usage, context, vocabulary — NOT about hand positions or gestures.

Return ONLY valid JSON:
{{
  "topic": "{topic}",
  "level": "{level}",
  "difficulty": "{difficulty}",
  "passing_score": 70,
  "questions": [
    {{
      "id": "q1",
      "question": "Question text",
      "type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Why this is correct",
      "hint": "A helpful hint before revealing the answer",
      "difficulty": "{difficulty}"
    }}
  ]
}}
"""
    raw_text = _call_gemini(prompt)
    return _extract_json(raw_text)


async def generate_feedback(
    topic: str,
    level: str,
    quiz_score: float,
    wrong_answers: list[dict],
    time_taken_seconds: int | None,
) -> dict:
    """Generate personalised post-quiz feedback."""
    prompt = f"""
{SYSTEM_INSTRUCTION}

A learner just completed an ISL quiz. Generate personalised feedback.

Topic: {topic}
Level: {level}
Score: {quiz_score}%
Wrong answers: {json.dumps(wrong_answers, indent=2)}
Time taken: {time_taken_seconds or 'not recorded'} seconds

Return ONLY valid JSON:
{{
  "score_percentage": {quiz_score},
  "passed": {"true" if quiz_score >= 70 else "false"},
  "encouraging_message": "2-3 sentence personalised feedback message",
  "strengths": ["What they did well"],
  "weak_areas": ["Areas needing more practice"],
  "revision_suggestions": ["Specific revision activity 1", "Specific revision activity 2"],
  "next_recommended_topic": "The most logical next topic",
  "xp_earned": {"calculate between 10 and 100 based on score"}
}}
"""
    raw_text = _call_gemini(prompt)
    return _extract_json(raw_text)


async def generate_roadmap(
    level: str,
    weak_topics: list[str],
    completed_modules: list[str],
    daily_goal_minutes: int,
) -> dict:
    """Generate a personalised learning roadmap."""
    all_modules = ISL_MODULES
    remaining = [m for m in all_modules if m not in completed_modules]

    prompt = f"""
{SYSTEM_INSTRUCTION}

Generate a personalised ISL learning roadmap for the Abhivyakti app.

Learner level: {level}
Completed modules: {completed_modules}
Remaining modules to cover: {remaining}
Weak topics: {weak_topics}
Daily learning goal: {daily_goal_minutes} minutes

Return ONLY valid JSON:
{{
  "level": "{level}",
  "total_modules": {len(remaining)},
  "estimated_total_hours": 0.0,
  "daily_goal_minutes": {daily_goal_minutes},
  "personalized_message": "2-3 sentence personalised roadmap introduction",
  "quick_wins": ["Quick win 1 for motivation", "Quick win 2"],
  "modules": [
    {{
      "id": "module_slug",
      "title": "Module title",
      "description": "What this module covers",
      "estimated_duration_minutes": 45,
      "topics": ["topic1", "topic2", "topic3"],
      "priority": 1,
      "prerequisites": []
    }}
  ]
}}

Order modules by priority (1 = highest). Include weak topics in earlier modules.
"""
    raw_text = _call_gemini(prompt)
    return _extract_json(raw_text)
