from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.demo_reviews import DEMO_REVIEWS
from app.models.product_review import ProductReview


async def ensure_demo_reviews(db: AsyncSession, product_id: int) -> int:
    """Attach demo reviews when a product has none (for local / UI testing)."""
    count_result = await db.execute(
        select(func.count())
        .select_from(ProductReview)
        .where(ProductReview.product_id == product_id)
    )
    existing = count_result.scalar_one()
    if existing > 0:
        return existing

    for review_data in DEMO_REVIEWS:
        db.add(ProductReview(product_id=product_id, **review_data))

    await db.commit()
    return len(DEMO_REVIEWS)
