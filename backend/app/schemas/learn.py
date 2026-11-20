"""
Pydantic schemas for the AI-powered ISL Learning module.
NEW FILE — does not modify any existing schema.
"""
from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class LearnerLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class LessonType(str, Enum):
    INTRODUCTION = "introduction"
    ALPHABET = "alphabet"
    NUMBER = "number"
    VOCABULARY = "vocabulary"
    CONVERSATION = "conversation"
    QUIZ = "quiz"
    REVISION = "revision"


class QuizDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class AssessmentRequest(BaseModel):
    answers: dict[str, Any] = Field(
        ...,
        description="Map of question_id → user answer from onboarding assessment",
    )
    self_reported_level: str | None = Field(
        None,
        description="User's self-reported level (beginner/intermediate/advanced)",
    )


class LessonRequest(BaseModel):
    module_id: str = Field(..., description="Module identifier, e.g. 'greetings'")
    topic: str = Field(..., description="Specific topic within the module")
    level: LearnerLevel = Field(LearnerLevel.BEGINNER)
    lesson_type: LessonType = Field(LessonType.INTRODUCTION)
    weak_topics: list[str] = Field(default_factory=list)
    completed_topics: list[str] = Field(default_factory=list)
    language: str = Field("en", description="Response language code")


class QuizRequest(BaseModel):
    topic: str
    level: LearnerLevel = LearnerLevel.BEGINNER
    difficulty: QuizDifficulty = QuizDifficulty.EASY
    num_questions: int = Field(5, ge=2, le=10)
    weak_topics: list[str] = Field(default_factory=list)


class FeedbackRequest(BaseModel):
    topic: str
    level: LearnerLevel
    quiz_score: float = Field(..., ge=0, le=100, description="Percentage score 0-100")
    wrong_answers: list[dict[str, Any]] = Field(default_factory=list)
    time_taken_seconds: int | None = None


class RoadmapRequest(BaseModel):
    level: LearnerLevel
    weak_topics: list[str] = Field(default_factory=list)
    completed_modules: list[str] = Field(default_factory=list)
    daily_goal_minutes: int = Field(15, ge=5, le=60)


class ScenarioImageRequest(BaseModel):
    topic: str = Field(..., description="Learning topic for scene illustration")
    scene_description: str = Field(
        ...,
        description="Plain-English description of the educational scene to generate",
    )
    style: str = Field(
        "friendly educational illustration, warm colors, diverse characters",
        description="Visual style guidance",
    )


# ---------------------------------------------------------------------------
# Response Models
# ---------------------------------------------------------------------------

class AssessmentResult(BaseModel):
    recommended_level: LearnerLevel
    summary: str
    strengths: list[str]
    areas_to_improve: list[str]
    suggested_first_module: str
    personalized_message: str


class LessonContent(BaseModel):
    title: str
    module: str
    topic: str
    level: LearnerLevel
    duration_minutes: int
    objectives: list[str]
    introduction: str
    sections: list[dict[str, Any]]
    key_signs: list[dict[str, str]]
    practice_activities: list[str]
    summary: str
    next_topic_hint: str
    scene_prompt: str = Field(
        "", description="Prompt for generating educational illustration"
    )


class QuizQuestion(BaseModel):
    id: str
    question: str
    type: str = Field("multiple_choice", description="multiple_choice | true_false | fill_blank")
    options: list[str] = Field(default_factory=list)
    correct_answer: str
    explanation: str
    hint: str
    difficulty: QuizDifficulty


class QuizContent(BaseModel):
    topic: str
    level: LearnerLevel
    difficulty: QuizDifficulty
    questions: list[QuizQuestion]
    passing_score: int = Field(70, description="Minimum passing percentage")


class FeedbackContent(BaseModel):
    score_percentage: float
    passed: bool
    encouraging_message: str
    strengths: list[str]
    weak_areas: list[str]
    revision_suggestions: list[str]
    next_recommended_topic: str
    xp_earned: int


class RoadmapModule(BaseModel):
    id: str
    title: str
    description: str
    estimated_duration_minutes: int
    topics: list[str]
    priority: int
    prerequisites: list[str] = Field(default_factory=list)


class LearningRoadmap(BaseModel):
    level: LearnerLevel
    total_modules: int
    estimated_total_hours: float
    daily_goal_minutes: int
    modules: list[RoadmapModule]
    personalized_message: str
    quick_wins: list[str]


class ScenarioImageResponse(BaseModel):
    image_base64: str | None = None
    image_url: str | None = None
    topic: str
    scene_description: str
    generation_note: str = ""


# ---------------------------------------------------------------------------
# Generic wrapper
# ---------------------------------------------------------------------------

class LearnResponse(BaseModel):
    success: bool = True
    message: str = "OK"
    data: Any = None
