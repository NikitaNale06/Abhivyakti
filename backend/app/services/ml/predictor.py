"""
STATIC STUB PREDICTOR — FOR DEVELOPMENT ONLY.

Real ML model aane pe is file ko replace karo.
Interface same rakhna:
  - is_ready() -> bool
  - predict_base64(b64) -> PredictionResult
  - model_version: str
"""
import base64
import random
from dataclasses import dataclass
from functools import lru_cache
from typing import List

from app.schemas.predict import Alternative


STATIC_LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ") + [str(d) for d in range(10)]


@dataclass
class PredictionResult:
    sign: str
    confidence: float
    alternatives: List[Alternative]


class Predictor:
    def __init__(self) -> None:
        self.model_version = "static-stub-v0"

    def is_ready(self) -> bool:
        return True

    def predict_base64(self, b64: str) -> PredictionResult:
        _ = base64.b64decode(b64)  # validate base64

        sign = random.choice(STATIC_LABELS)
        confidence = round(random.uniform(0.55, 0.98), 3)
        alts = [
            Alternative(sign=random.choice(STATIC_LABELS), confidence=round(random.uniform(0.05, 0.4), 3))
            for _ in range(2)
        ]
        return PredictionResult(sign=sign, confidence=confidence, alternatives=alts)


@lru_cache(maxsize=1)
def get_predictor() -> Predictor:
    return Predictor()