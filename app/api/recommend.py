import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.data.demo_reviews import MOCK_RECOMMENDATION
from app.schemas.recommendation import RecommendRequest, RecommendResponse
from app.services.demo_data import ensure_demo_reviews
from app.services.recommendation import (
    RecommendationService,
    load_recommendation_context,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["recommendation"])

_service: RecommendationService | None = None


def _get_ai_service() -> RecommendationService | None:
    global _service
    if not settings.openai_api_key:
        return None
    if _service is None:
        _service = RecommendationService()
    return _service


@router.post(
    "/recommend",
    response_model=RecommendResponse,
    summary="Get AI-powered size recommendation",
)
async def recommend_size(
    body: RecommendRequest,
    db: AsyncSession = Depends(get_db),
) -> RecommendResponse:
    ctx = await load_recommendation_context(db, body.user_id, body.product_id)

    if ctx is None:
        user_exists = await _user_exists(db, body.user_id)
        if not user_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User profile {body.user_id} not found",
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {body.product_id} not found",
        )

    has_page = bool(ctx.product.page_context and ctx.product.page_context.strip())
    has_reviews = bool(ctx.product.reviews)

    if not has_reviews and not has_page and settings.demo_mode:
        await ensure_demo_reviews(db, body.product_id)
        ctx = await load_recommendation_context(db, body.user_id, body.product_id)
        has_reviews = bool(ctx.product.reviews)

    if not has_reviews and not has_page:
        if settings.demo_mode:
            return MOCK_RECOMMENDATION
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fit data available for this product",
        )

    service = _get_ai_service()
    if service is None:
        if settings.demo_mode:
            return MOCK_RECOMMENDATION
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured (missing OPENAI_API_KEY)",
        )

    try:
        return await service.generate_recommendation(ctx)
    except Exception as exc:
        logger.warning("AI recommendation failed, using mock fallback: %s", exc)
        if settings.demo_mode:
            return MOCK_RECOMMENDATION
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate recommendation from AI",
        ) from exc


async def _user_exists(db: AsyncSession, user_id: int) -> bool:
    from sqlalchemy import select

    from app.models.user_profile import UserProfile

    result = await db.execute(
        select(UserProfile.id).where(UserProfile.id == user_id)
    )
    return result.scalar_one_or_none() is not None
