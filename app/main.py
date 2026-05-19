from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.products import router as products_router
from app.api.recommend import router as recommend_router
from app.api.users import router as users_router
from app.core.config import settings
from app.core.database import init_db
from app.models import Product, ProductReview, UserProfile  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="SizeFitAI",
    description="AI-powered size recommendations based on product reviews",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: allow any origin for extension + web clients (Chrome disallows
# allow_credentials=True with allow_origins=["*"], so credentials stay off).
_cors = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
_allow_all = _cors == ["*"] or _cors == []

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_all else _cors,
    allow_credentials=False if _allow_all else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(products_router)
app.include_router(recommend_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
