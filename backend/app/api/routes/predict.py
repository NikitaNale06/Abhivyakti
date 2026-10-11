import logging
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.predict import PredictRequest, PredictResponse
from app.services.ml.predictor import get_predictor
from app.services.translation.translator import translate_label

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest) -> PredictResponse:
    predictor = get_predictor()

    if not predictor.is_ready():
        raise HTTPException(status_code=503, detail="Model not loaded. Try again later.")

    try:
        result = predictor.predict_base64(payload.image_base64)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail="Prediction failed")

    accepted = result.confidence >= settings.confidence_threshold
    display = translate_label(result.sign, payload.language) if accepted else None

    return PredictResponse(
        status="ok" if accepted else "low_confidence",
        sign=result.sign,
        display=display,
        confidence=result.confidence,
        accepted=accepted,
        model_version=predictor.model_version,
        alternatives=result.alternatives,
        message=None if accepted else "Not sure — try again",
    )