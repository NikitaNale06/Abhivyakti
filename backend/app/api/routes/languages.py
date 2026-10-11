from fastapi import APIRouter
from app.services.translation.translator import SUPPORTED_LANGUAGES

router = APIRouter()


@router.get("/languages")
def list_languages():
    return {"languages": SUPPORTED_LANGUAGES}