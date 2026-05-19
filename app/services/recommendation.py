import json
import logging
import re
from dataclasses import dataclass

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.enums import (
    BodyShape,
    BottomsFit,
    FitFeedback,
    OuterwearFit,
    TopsFit,
)
from app.models.product import Product
from app.models.user_profile import UserProfile
from app.schemas.recommendation import RecommendResponse

logger = logging.getLogger(__name__)

FIT_FEEDBACK_LABELS: dict[FitFeedback, str] = {
    FitFeedback.TOO_SMALL: "too small",
    FitFeedback.TOO_BIG: "too big",
    FitFeedback.FITS: "true to size",
}

TOPS_FIT_LABELS: dict[TopsFit, str] = {
    TopsFit.TIGHT: "tight / fitted",
    TopsFit.REGULAR: "regular",
    TopsFit.OVERSIZED: "oversized",
}

BOTTOMS_FIT_LABELS: dict[BottomsFit, str] = {
    BottomsFit.SLIM: "slim",
    BottomsFit.STRAIGHT: "straight",
    BottomsFit.LOOSE: "loose / relaxed",
}

OUTERWEAR_FIT_LABELS: dict[OuterwearFit, str] = {
    OuterwearFit.SNUG: "snug",
    OuterwearFit.REGULAR: "regular",
    OuterwearFit.LAYERING: "roomy / layering",
}

BODY_SHAPE_LABELS: dict[BodyShape, str] = {
    BodyShape.BROAD_SHOULDERS: "broad shoulders",
    BodyShape.LONG_TORSO: "long torso",
    BodyShape.STANDARD: "standard build",
}

SYSTEM_PROMPT = """\
You are an expert fashion sizing consultant for mainstream retailers (Zara, H&M, ASOS, Nike).
Analyze customer reviews for a specific product and recommend the best size for this user.

Rules:
1. Weight review fit patterns (too small / too big / true to size) and purchased sizes heavily.
2. Cross-reference the user's brand-specific size benchmarks (e.g. "usually L in Zara").
3. Apply category-specific fit preferences (tops, bottoms, outerwear) — match the product type.
4. Factor in body shape (broad shoulders, long torso, etc.) when reviews mention shoulder/chest/torso fit.
5. If the item runs small, recommend sizing up; if large, sizing down.
6. confidence_score: 1–100 based on review volume, pattern consistency, and profile relevance.
7. reasoning: 2–4 concise sentences in English. Cite percentages or patterns when possible.

Return JSON only, no extra text:
{
  "recommended_size": "L",
  "confidence_score": 85,
  "reasoning": "English explanation..."
}
"""

USER_PROMPT_TEMPLATE = """\
## User profile
- Name: {name}
- Height: {height_cm} cm | Weight: {weight_kg} kg
- Body shape: {body_shape}

## Brand size benchmarks
- Zara: {zara_size}
- H&M: {hm_size}
- ASOS: {asos_size}
- Nike: {nike_size}

## Category fit preferences
- Tops / shirts: {tops_fit}
- Bottoms / pants: {bottoms_fit}
- Outerwear / jackets: {outerwear_fit}

## Product
- Brand: {brand}
- Name: {product_name}
- Inferred category: {product_category}
- External ID: {external_product_id}

## Reviews ({review_count} total)
{reviews_block}

## Review statistics
- Too small: {too_small_count} ({too_small_pct}%)
- Too big: {too_big_count} ({too_big_pct}%)
- True to size: {fits_count} ({fits_pct}%)

Recommend the optimal size for this user. Prioritize the {brand} size benchmark and \
{category_fit_label} preference for this product category.
"""


@dataclass
class RecommendationContext:
    user: UserProfile
    product: Product


def infer_product_category(product: Product) -> str:
    name = product.name.lower()
    if re.search(r"jacket|coat|blazer|overshirt|parka|vest|outerwear", name):
        return "outerwear"
    if re.search(r"pant|jean|trouser|short|legging|jogger|skirt", name):
        return "bottoms"
    if re.search(r"shoe|sneaker|boot|trainer", name):
        return "footwear"
    return "tops"


def category_fit_label(user: UserProfile, category: str) -> str:
    if category == "outerwear":
        return OUTERWEAR_FIT_LABELS.get(user.outerwear_fit, "regular")
    if category == "bottoms":
        return BOTTOMS_FIT_LABELS.get(user.bottoms_fit, "straight")
    return TOPS_FIT_LABELS.get(user.tops_fit, "regular")


def brand_benchmark_size(user: UserProfile, brand: str) -> str:
    brand_key = brand.strip().lower()
    if "zara" in brand_key:
        return user.zara_size
    if "h&m" in brand_key or "hm" in brand_key:
        return user.hm_size
    if "asos" in brand_key:
        return user.asos_size
    if "nike" in brand_key:
        return user.nike_size
    return user.zara_size


async def load_recommendation_context(
    db: AsyncSession, user_id: int, product_id: int
) -> RecommendationContext | None:
    user_result = await db.execute(
        select(UserProfile).where(UserProfile.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        return None

    product_result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(selectinload(Product.reviews))
    )
    product = product_result.scalar_one_or_none()
    if product is None:
        return None

    return RecommendationContext(user=user, product=product)


class RecommendationService:
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.openai_model

    async def load_context(
        self, db: AsyncSession, user_id: int, product_id: int
    ) -> RecommendationContext | None:
        return await load_recommendation_context(db, user_id, product_id)

    def _build_reviews_block(self, ctx: RecommendationContext) -> str:
        if not ctx.product.reviews:
            return "(no reviews available)"

        lines: list[str] = []
        for i, review in enumerate(ctx.product.reviews, start=1):
            fit_label = FIT_FEEDBACK_LABELS[review.fit_feedback]
            lines.append(
                f"{i}. Purchased: {review.purchased_size} | Fit: {fit_label} | "
                f"Rating: {review.rating}/5\n"
                f'   "{review.review_text}"'
            )
        return "\n".join(lines)

    def _fit_stats(self, ctx: RecommendationContext) -> dict[str, int | float]:
        reviews = ctx.product.reviews
        total = len(reviews)
        if total == 0:
            return {
                "too_small_count": 0,
                "too_big_count": 0,
                "fits_count": 0,
                "too_small_pct": 0.0,
                "too_big_pct": 0.0,
                "fits_pct": 0.0,
            }

        too_small = sum(
            1 for r in reviews if r.fit_feedback == FitFeedback.TOO_SMALL
        )
        too_big = sum(1 for r in reviews if r.fit_feedback == FitFeedback.TOO_BIG)
        fits = sum(1 for r in reviews if r.fit_feedback == FitFeedback.FITS)

        return {
            "too_small_count": too_small,
            "too_big_count": too_big,
            "fits_count": fits,
            "too_small_pct": round(too_small / total * 100, 1),
            "too_big_pct": round(too_big / total * 100, 1),
            "fits_pct": round(fits / total * 100, 1),
        }

    def build_user_prompt(self, ctx: RecommendationContext) -> str:
        stats = self._fit_stats(ctx)
        user = ctx.user
        product = ctx.product
        category = infer_product_category(product)

        return USER_PROMPT_TEMPLATE.format(
            name=user.name,
            height_cm=user.height_cm,
            weight_kg=user.weight_kg,
            body_shape=BODY_SHAPE_LABELS.get(user.body_shape, "standard"),
            zara_size=user.zara_size,
            hm_size=user.hm_size,
            asos_size=user.asos_size,
            nike_size=user.nike_size,
            tops_fit=TOPS_FIT_LABELS.get(user.tops_fit, "regular"),
            bottoms_fit=BOTTOMS_FIT_LABELS.get(user.bottoms_fit, "straight"),
            outerwear_fit=OUTERWEAR_FIT_LABELS.get(user.outerwear_fit, "regular"),
            brand=product.brand,
            product_name=product.name,
            product_category=category,
            external_product_id=product.external_product_id,
            category_fit_label=category_fit_label(user, category),
            review_count=len(product.reviews),
            reviews_block=self._build_reviews_block(ctx),
            **stats,
        )

    async def generate_recommendation(
        self, ctx: RecommendationContext
    ) -> RecommendResponse:
        user_prompt = self.build_user_prompt(ctx)

        response = await self._client.chat.completions.create(
            model=self._model,
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )

        raw_content = response.choices[0].message.content
        if not raw_content:
            raise ValueError("Empty response from AI model")

        try:
            payload = json.loads(raw_content)
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse AI JSON: %s", raw_content)
            raise ValueError("Invalid JSON from AI model") from exc

        return RecommendResponse.model_validate(payload)
