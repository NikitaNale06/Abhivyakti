"""
Educational image generation service using Gemini's image generation capability.
NEW FILE — does not modify any existing service.

STRICT RULE: Only generates educational scene illustrations.
NEVER generates ISL hand signs, gestures, or hand configurations.

Environment variable required:
  GEMINI_API_KEY=your_key_here
"""
from __future__ import annotations

import base64
import logging
import os
import re

logger = logging.getLogger(__name__)

IMAGE_GEN_MODEL = "gemini-2.5-flash-image"

SAFETY_PREFIX = (
    "Educational illustration for a sign language learning app. "
    "No hand signs, no gestures, no sign language demonstrations. "
    "Scene: "
)

SAFETY_SUFFIX = (
    " Friendly, warm, diverse characters. "
    "Clean, modern, educational style. "
    "Suitable for all ages."
)

_client = None


def _get_client():
    global _client
    if _client is None:
        try:
            from google import genai  # type: ignore
            api_key = os.getenv("GEMINI_API_KEY", "")
            if not api_key:
                raise ValueError("GEMINI_API_KEY environment variable is not set.")
            _client = genai.Client(api_key=api_key)
        except ImportError as exc:
            raise RuntimeError(
                "google-genai package is not installed. Run: pip install google-genai"
            ) from exc
    return _client


def _sanitise_prompt(scene_description: str, style: str) -> str:
    """
    Sanitise and wrap prompt to guarantee no ISL sign/gesture generation.
    Block any attempt to generate hand configurations.
    """
    # Remove any hand-related terms that could lead to gesture generation
    blocked_terms = [
        "hand sign", "hand gesture", "sign language gesture",
        "finger spelling", "fingerspelling", "sign for", "signing",
        "palm facing", "finger position", "thumb up", "thumbs up",
        "index finger", "pinky", "ASL", "ISL sign", "gesture",
    ]
    sanitised = scene_description
    for term in blocked_terms:
        sanitised = re.sub(re.escape(term), "[educational scene]", sanitised, flags=re.IGNORECASE)

    full_prompt = f"{SAFETY_PREFIX}{sanitised}. Style: {style}{SAFETY_SUFFIX}"
    return full_prompt


async def generate_scenario_image(
    topic: str,
    scene_description: str,
    style: str = "friendly educational illustration, warm colors, diverse characters",
) -> dict:
    """
    Generate an educational scene illustration for a learning topic.

    Returns a dict with image_base64 and metadata.
    Falls back gracefully if generation fails.
    """
    prompt = _sanitise_prompt(scene_description, style)
    logger.info(f"Generating scenario image for topic='{topic}'")

    try:
        from google.genai import types  # type: ignore

        client = _get_client()
        response = client.models.generate_content(
            model=IMAGE_GEN_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )

        image_base64 = None
        generation_note = ""

        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                image_bytes = part.inline_data.data
                image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                generation_note = "Educational illustration generated successfully."
                break
            elif hasattr(part, "text") and part.text:
                generation_note = part.text[:200]

        return {
            "image_base64": image_base64,
            "image_url": None,
            "topic": topic,
            "scene_description": scene_description,
            "generation_note": generation_note,
        }

    except Exception as exc:
        logger.warning(f"Image generation failed for topic='{topic}': {exc}")
        return {
            "image_base64": None,
            "image_url": None,
            "topic": topic,
            "scene_description": scene_description,
            "generation_note": f"Image generation unavailable: {str(exc)[:100]}",
        }
