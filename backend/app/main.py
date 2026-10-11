from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import predict, languages, health
from app.core.config import settings

app = FastAPI(title="Abhivyakti API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_prefix, tags=["health"])
app.include_router(predict.router, prefix=settings.api_prefix, tags=["predict"])
app.include_router(languages.router, prefix=settings.api_prefix, tags=["languages"])


@app.get("/")
def root():
    return {"name": "Abhivyakti API", "version": "0.2.0", "status": "ok"}