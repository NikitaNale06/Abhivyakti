from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class PredictRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded JPEG frame")
    language: str = Field(default="en", description="Target language code")

    @field_validator("image_base64")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or len(v) < 32:
            raise ValueError("image_base64 is empty or too short")
        return v


class Alternative(BaseModel):
    sign: str
    confidence: float


class PredictResponse(BaseModel):
    status: str = "ok"
    sign: Optional[str] = None
    display: Optional[str] = None
    confidence: Optional[float] = None
    accepted: Optional[bool] = None
    model_version: Optional[str] = None
    message: Optional[str] = None
    alternatives: Optional[List[Alternative]] = None