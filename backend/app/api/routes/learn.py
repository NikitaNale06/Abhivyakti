"""
FastAPI router for AI-powered ISL Learning module.
NEW FILE — does not modify any existing route.

Provides endpoints for:
- POST /api/v1/learn/assessment
- POST /api/v1/learn/lesson
- POST /api/v1/learn/quiz
- POST /api/v1/learn/feedback
- POST /api/v1/learn/roadmap
- POST /api/v1/learn/image
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.schemas.learn import (
    AssessmentRequest,
    AssessmentResult,
    FeedbackContent,
    FeedbackRequest,
    LearningRoadmap,
    LearnResponse,
    LessonContent,
    LessonRequest,
    QuizContent,
    QuizRequest,
    RoadmapRequest,
    ScenarioImageRequest,
    ScenarioImageResponse,
)
from app.services import gemini_service, image_gen_service

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_optional_current_user_token(
    authorization: str | None = Header(None, description="Bearer <token>"),
) -> str | None:
    """Optional bearer token verification helper."""
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


@router.post(
    "/assessment",
    response_model=LearnResponse,
    summary="Analyse onboarding assessment and recommend learning profile",
)
async def assess_learner(
    payload: AssessmentRequest,
    token: str | None = Depends(get_optional_current_user_token),
) -> LearnResponse:
    try:
        data = await gemini_service.generate_assessment_result(
            answers=payload.answers,
            self_reported_level=payload.self_reported_level,
        )
        return LearnResponse(
            success=True,
            message="Assessment analysed successfully",
            data=data,
        )
    except Exception as exc:
        logger.error(f"Error in assessment: {exc}", exc_info=True)
        # --- OFFLINE FALLBACK (commented out per user request — using live Gemini API) ---
        # fallback = {
        #     "recommended_level": payload.self_reported_level or "beginner",
        #     "summary": "Welcome to your personalized ISL journey with Abhivyakti.",
        #     "strengths": ["Eagerness to learn Indian Sign Language"],
        #     "areas_to_improve": ["Basic everyday vocabulary and fingerspelling"],
        #     "suggested_first_module": "ISL Basics & Introduction",
        #     "personalized_message": "Namaste! Welcome to Abhivyakti. Let's begin building your ISL foundation step-by-step.",
        # }
        # return LearnResponse(
        #     success=True,
        #     message="Assessment completed (fallback profile)",
        #     data=fallback,
        # )
        # ---------------------------------------------------------------------------------
        raise HTTPException(status_code=503, detail=f"AI service error: {str(exc)[:300]}")


@router.post(
    "/lesson",
    response_model=LearnResponse,
    summary="Generate personalized lesson content for a module & topic",
)
async def get_lesson(
    payload: LessonRequest,
    token: str | None = Depends(get_optional_current_user_token),
) -> LearnResponse:
    try:
        data = await gemini_service.generate_lesson(
            module_id=payload.module_id,
            topic=payload.topic,
            level=payload.level.value if hasattr(payload.level, "value") else str(payload.level),
            lesson_type=payload.lesson_type.value if hasattr(payload.lesson_type, "value") else str(payload.lesson_type),
            weak_topics=payload.weak_topics,
            completed_topics=payload.completed_topics,
        )
        return LearnResponse(
            success=True,
            message="Lesson generated successfully",
            data=data,
        )
    except Exception as exc:
        logger.error(f"Error in generate_lesson: {exc}", exc_info=True)
        # --- OFFLINE FALLBACK (commented out per user request — using live Gemini API) ---
        # fallback = {
        #     "title": f"Introduction to {payload.topic}",
        #     "module": payload.module_id,
        #     "topic": payload.topic,
        #     "level": payload.level.value if hasattr(payload.level, "value") else str(payload.level),
        #     "duration_minutes": 10,
        #     "objectives": [
        #         f"Understand common ISL vocabulary for {payload.topic}",
        #         "Learn the cultural and practical context of these signs",
        #         "Practice recognizing and using these signs in everyday settings",
        #     ],
        #     "introduction": f"In this lesson, you will explore Indian Sign Language expressions used in {payload.topic}.",
        #     "sections": [...],
        #     "key_signs": [...],
        #     "practice_activities": [...],
        #     "summary": f"You learned foundational expressions and cultural contexts for {payload.topic}.",
        #     "next_topic_hint": "Continue to the next lesson or test your recall with a quick quiz.",
        #     "scene_prompt": f"Two people politely greeting each other in an Indian workplace or classroom setting.",
        # }
        # return LearnResponse(success=True, message="Lesson retrieved (offline resilient content)", data=fallback)
        # ---------------------------------------------------------------------------------
        raise HTTPException(status_code=503, detail=f"AI service error: {str(exc)[:300]}")


@router.post(
    "/quiz",
    response_model=LearnResponse,
    summary="Generate interactive quiz questions for a topic",
)
async def get_quiz(
    payload: QuizRequest,
    token: str | None = Depends(get_optional_current_user_token),
) -> LearnResponse:
    try:
        data = await gemini_service.generate_quiz(
            topic=payload.topic,
            level=payload.level.value if hasattr(payload.level, "value") else str(payload.level),
            difficulty=payload.difficulty.value if hasattr(payload.difficulty, "value") else str(payload.difficulty),
            num_questions=payload.num_questions,
            weak_topics=payload.weak_topics,
        )
        return LearnResponse(
            success=True,
            message="Quiz generated successfully",
            data=data,
        )
    except Exception as exc:
        logger.error(f"Error in generate_quiz: {exc}", exc_info=True)
        # --- OFFLINE FALLBACK (commented out per user request — using live Gemini API) ---
        # fallback = {
        #     "topic": payload.topic,
        #     "level": payload.level.value if hasattr(payload.level, "value") else str(payload.level),
        #     "difficulty": payload.difficulty.value if hasattr(payload.difficulty, "value") else str(payload.difficulty),
        #     "passing_score": 70,
        #     "questions": [
        #         {
        #             "id": "q1",
        #             "question": f"In Indian Sign Language, what is essential when expressing '{payload.topic}'?",
        #             "type": "multiple_choice",
        #             "options": [
        #                 "Appropriate facial expressions and clear hand orientation",
        #                 "Speaking out loud with a loud voice",
        #                 "Using only one hand at all times",
        #                 "Looking away from the person you are communicating with",
        #             ],
        #             "correct_answer": "Appropriate facial expressions and clear hand orientation",
        #             "explanation": "ISL is a visual-spatial language where facial expressions carry vital grammatical and emotional cues.",
        #             "hint": "Think about how non-verbal cues complement visual language.",
        #             "difficulty": "easy",
        #         },
        #         {
        #             "id": "q2",
        #             "question": "Which of the following is true about Indian Sign Language (ISL)?",
        #             "type": "multiple_choice",
        #             "options": [
        #                 "ISL has its own distinct grammar and syntax independent of spoken languages",
        #                 "ISL is merely a word-for-word translation of spoken English or Hindi",
        #                 "ISL does not use spatial relationships",
        #                 "ISL is identical to American Sign Language (ASL)",
        #             ],
        #             "correct_answer": "ISL has its own distinct grammar and syntax independent of spoken languages",
        #             "explanation": "ISL is a complete, natural language with its own rich grammatical structure and linguistic properties.",
        #             "hint": "Consider whether sign languages are independent languages.",
        #             "difficulty": "easy",
        #         },
        #         {
        #             "id": "q3",
        #             "question": f"When practicing signs related to {payload.topic}, what is recommended?",
        #             "type": "multiple_choice",
        #             "options": [
        #                 "Observe official visual reference demonstrations and practice in a comfortable signing space",
        #                 "Speed through signs as fast as possible without clarity",
        #                 "Inventing new hand movements",
        #                 "Only memorizing written words without visual practice",
        #             ],
        #             "correct_answer": "Observe official visual reference demonstrations and practice in a comfortable signing space",
        #             "explanation": "Standardized ISL signs should be learned from verified visual demonstrations within the signing space.",
        #             "hint": "Clarity and accuracy come from verified models.",
        #             "difficulty": "easy",
        #         },
        #     ],
        # }
        # return LearnResponse(success=True, message="Quiz retrieved (resilient offline fallback)", data=fallback)
        # ---------------------------------------------------------------------------------
        raise HTTPException(status_code=503, detail=f"AI service error: {str(exc)[:300]}")


@router.post(
    "/feedback",
    response_model=LearnResponse,
    summary="Generate personalized feedback on quiz performance",
)
async def get_feedback(
    payload: FeedbackRequest,
    token: str | None = Depends(get_optional_current_user_token),
) -> LearnResponse:
    try:
        data = await gemini_service.generate_feedback(
            topic=payload.topic,
            level=payload.level.value if hasattr(payload.level, "value") else str(payload.level),
            quiz_score=payload.quiz_score,
            wrong_answers=payload.wrong_answers,
            time_taken_seconds=payload.time_taken_seconds,
        )
        return LearnResponse(
            success=True,
            message="Feedback generated successfully",
            data=data,
        )
    except Exception as exc:
        logger.error(f"Error in generate_feedback: {exc}", exc_info=True)
        # --- OFFLINE FALLBACK (commented out per user request — using live Gemini API) ---
        # passed = payload.quiz_score >= 70
        # xp = int(payload.quiz_score * 0.8 + (20 if passed else 10))
        # fallback = {
        #     "score_percentage": payload.quiz_score,
        #     "passed": passed,
        #     "encouraging_message": (
        #         "Fantastic effort! You've shown great dedication in this ISL quiz."
        #         if passed
        #         else "Good try! Practice makes perfect in visual communication. Review the tricky concepts and try again."
        #     ),
        #     "strengths": ["Consistent engagement with learning materials", "Understanding core concepts"],
        #     "weak_areas": ["Detailed nuance and rapid recall under time pressure"] if not passed else [],
        #     "revision_suggestions": [
        #         f"Re-read the key points in {payload.topic}",
        #         "Practice along with the visual sign demos in Abhivyakti",
        #     ],
        #     "next_recommended_topic": "Next module topic",
        #     "xp_earned": max(10, min(100, xp)),
        # }
        # return LearnResponse(
        #     success=True,
        #     message="Feedback retrieved (fallback)",
        #     data=fallback,
        # )
        # ---------------------------------------------------------------------------------
        raise HTTPException(status_code=503, detail=f"AI service error: {str(exc)[:300]}")


@router.post(
    "/roadmap",
    response_model=LearnResponse,
    summary="Generate tailored learning roadmap based on user progress",
)
async def get_roadmap(
    payload: RoadmapRequest,
    token: str | None = Depends(get_optional_current_user_token),
) -> LearnResponse:
    try:
        data = await gemini_service.generate_roadmap(
            level=payload.level.value if hasattr(payload.level, "value") else str(payload.level),
            weak_topics=payload.weak_topics,
            completed_modules=payload.completed_modules,
            daily_goal_minutes=payload.daily_goal_minutes,
        )
        return LearnResponse(
            success=True,
            message="Roadmap generated successfully",
            data=data,
        )
    except Exception as exc:
        logger.error(f"Error in generate_roadmap: {exc}", exc_info=True)
        # --- OFFLINE FALLBACK (commented out per user request — using live Gemini API) ---
        # fallback = {
        #     "level": payload.level.value if hasattr(payload.level, "value") else str(payload.level),
        #     "total_modules": 9,
        #     "estimated_total_hours": 6.5,
        #     "daily_goal_minutes": payload.daily_goal_minutes,
        #     "personalized_message": "Here is your structured Indian Sign Language roadmap designed to give you everyday communication fluency.",
        #     "quick_wins": ["Mastering greetings in 10 minutes", "Recognizing basic numbers and alphabet"],
        #     "modules": [
        #         {
        #             "id": "basics",
        #             "title": "ISL Basics & Introduction",
        #             "description": "Foundations of visual language, signing space, and facial expressions",
        #             "estimated_duration_minutes": 30,
        #             "topics": ["Visual Space & Posture", "Facial Expressions in Grammar", "Attention Getting"],
        #             "priority": 1,
        #             "prerequisites": [],
        #         },
        #         {
        #             "id": "alphabets-numbers",
        #             "title": "Alphabets & Numbers",
        #             "description": "Fingerspelling 26 letters and counting 1-100",
        #             "estimated_duration_minutes": 45,
        #             "topics": ["A to M Fingerspelling", "N to Z Fingerspelling", "Digits 0-9", "Tens & Hundreds"],
        #             "priority": 2,
        #             "prerequisites": ["basics"],
        #         },
        #         {
        #             "id": "greetings",
        #             "title": "Everyday Greetings",
        #             "description": "Namaste, Hello, Good Morning, Thank You, and common courtesies",
        #             "estimated_duration_minutes": 30,
        #             "topics": ["Namaste & Hello", "Courtesies & Polite Words", "How Are You & Replies"],
        #             "priority": 3,
        #             "prerequisites": ["basics"],
        #         },
        #     ],
        # }
        # return LearnResponse(
        #     success=True,
        #     message="Roadmap retrieved (fallback)",
        #     data=fallback,
        # )
        # ---------------------------------------------------------------------------------
        raise HTTPException(status_code=503, detail=f"AI service error: {str(exc)[:300]}")


@router.post(
    "/image",
    response_model=LearnResponse,
    summary="Generate educational scene illustration (NO hand gestures)",
)
async def get_scenario_image(
    payload: ScenarioImageRequest,
    token: str | None = Depends(get_optional_current_user_token),
) -> LearnResponse:
    try:
        data = await image_gen_service.generate_scenario_image(
            topic=payload.topic,
            scene_description=payload.scene_description,
            style=payload.style,
        )
        return LearnResponse(
            success=True,
            message="Scenario illustration generated",
            data=data,
        )
    except Exception as exc:
        logger.error(f"Error in generate_scenario_image: {exc}", exc_info=True)
        return LearnResponse(
            success=True,
            message="Scenario image fallback",
            data={
                "image_base64": None,
                "image_url": None,
                "topic": payload.topic,
                "scene_description": payload.scene_description,
                "generation_note": "Illustration unavailable in offline mode.",
            },
        )
