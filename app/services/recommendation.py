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
You are an expert fashion sizing consultant for ANY clothing brand and e-commerce site worldwide.
Analyze fit information and recommend the best size for this user.

Rules:
1. Use review patterns OR raw page text (size charts, fit notes, "runs small", model info).
2. Cross-reference the user's benchmark brand and usual size.
3. Apply their fit preference (relaxed / fitted / oversized).
4. Parse sizing dynamically from unstructured page text when reviews are absent.
5. Never refuse because the brand is unknown — infer from available signals.
6. confidence_score: 1–100 based on evidence quality.
7. reasoning: 2–4 concise sentences in English.

Return JSON only:
{
  "recommended_size": "L",
  "confidence_score": 85,
  "reasoning": "English explanation..."
}
"""

USER_PROMPT_TEMPLATE = """\
## User profile
- Fit preference (tops): {tops_fit}
- Fit preference (bottoms): {bottoms_fit}
- Fit preference (outerwear): {outerwear_fit}
- Primary benchmark: usually size {benchmark_size} at {benchmark_brand}

## Product
- Brand: {brand}
- Name: {product_name}
- Category: {product_category}
- URL context: {external_product_id}

## Customer reviews ({review_count} total)
{reviews_block}

## Review statistics
- Too small: {too_small_count} ({too_small_pct}%)
- Too big: {too_big_count} ({too_big_pct}%)
- True to size: {fits_count} ({fits_pct}%)

Recommend the optimal size. Prioritize benchmark {benchmark_brand} size {benchmark_size} and {category_fit_label} fit.
"""

UNIVERSAL_PAGE_PROMPT_TEMPLATE = """\
## User profile
- Fit preference (tops): {tops_fit}
- Fit preference (bottoms): {bottoms_fit}
- Fit preference (outerwear): {outerwear_fit}
- Primary benchmark: usually size {benchmark_size} at {benchmark_brand}

## Product
- Brand: {brand}
- Name: {product_name}
- Category: {product_category}
- Page URL id: {external_product_id}

## Raw page text (extract sizing / fit / reviews from this)
{page_context}

Parse size charts, fit guidance, model measurements, "runs small/large", available sizes, \
and customer comments in the text above. Recommend the best size for this user.

Apply benchmark {benchmark_brand} size {benchmark_size} and {category_fit_label} preference.
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


def user_benchmark(user: UserProfile) -> tuple[str, str]:
    brand = (user.benchmark_brand or "").strip() or "preferred brand"
    size = (user.benchmark_size or "").strip() or user.zara_size or "M"
    return brand, size


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
            return "(no structured reviews — see page text if provided)"

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
        user = ctx.user
        product = ctx.product
        category = infer_product_category(product)
        benchmark_brand, benchmark_size = user_benchmark(user)

        if product.page_context and not product.reviews:
            return UNIVERSAL_PAGE_PROMPT_TEMPLATE.format(
                tops_fit=TOPS_FIT_LABELS.get(user.tops_fit, "regular"),
                bottoms_fit=BOTTOMS_FIT_LABELS.get(user.bottoms_fit, "straight"),
                outerwear_fit=OUTERWEAR_FIT_LABELS.get(user.outerwear_fit, "regular"),
                benchmark_brand=benchmark_brand,
                benchmark_size=benchmark_size,
                brand=product.brand,
                product_name=product.name,
                product_category=category,
                external_product_id=product.external_product_id,
                category_fit_label=category_fit_label(user, category),
                page_context=product.page_context[:8000],
            )

        stats = self._fit_stats(ctx)
        return USER_PROMPT_TEMPLATE.format(
            tops_fit=TOPS_FIT_LABELS.get(user.tops_fit, "regular"),
            bottoms_fit=BOTTOMS_FIT_LABELS.get(user.bottoms_fit, "straight"),
            outerwear_fit=OUTERWEAR_FIT_LABELS.get(user.outerwear_fit, "regular"),
            benchmark_brand=benchmark_brand,
            benchmark_size=benchmark_size,
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
