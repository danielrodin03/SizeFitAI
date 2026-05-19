"""
Seed the database with sample data for testing the recommendation engine.

Usage (from project root):
    python -m scripts.seed
    python -m scripts.seed --reset   # delete sample rows and re-insert
"""

import argparse
import asyncio
import sys

from sqlalchemy import delete, select

from app.core.database import AsyncSessionLocal, init_db
from app.data.demo_reviews import DEMO_REVIEWS
from app.models.enums import (
    BodyShape,
    BottomsFit,
    OuterwearFit,
    TopsFit,
)
from app.models.product import Product
from app.models.product_review import ProductReview
from app.models.user_profile import UserProfile

SAMPLE_EXTERNAL_PRODUCT_ID = "zara-wool-blend-jacket-4527"

SAMPLE_USER = {
    "name": "Alex Morgan",
    "height_cm": 178.0,
    "weight_kg": 75.0,
    "zara_size": "M",
    "hm_size": "M",
    "asos_size": "L",
    "nike_size": "L",
    "tops_fit": TopsFit.REGULAR,
    "bottoms_fit": BottomsFit.STRAIGHT,
    "outerwear_fit": OuterwearFit.LAYERING,
    "body_shape": BodyShape.BROAD_SHOULDERS,
}

SAMPLE_PRODUCT = {
    "external_product_id": SAMPLE_EXTERNAL_PRODUCT_ID,
    "brand": "Zara",
    "name": "Wool Blend Overshirt Jacket",
    "link": "https://www.zara.com/il/en/wool-blend-overshirt-jacket-p04527255.html",
}


async def _find_existing_product(session) -> Product | None:
    result = await session.execute(
        select(Product).where(
            Product.external_product_id == SAMPLE_EXTERNAL_PRODUCT_ID
        )
    )
    return result.scalar_one_or_none()


async def _reset_sample_data(session) -> None:
    product = await _find_existing_product(session)
    if product:
        await session.execute(
            delete(ProductReview).where(ProductReview.product_id == product.id)
        )
        await session.delete(product)

    user_result = await session.execute(
        select(UserProfile).where(UserProfile.name == SAMPLE_USER["name"])
    )
    user = user_result.scalar_one_or_none()
    if user:
        await session.delete(user)

    await session.commit()


async def seed(reset: bool = False) -> tuple[int, int]:
    await init_db()

    async with AsyncSessionLocal() as session:
        existing = await _find_existing_product(session)

        if existing and not reset:
            user_result = await session.execute(
                select(UserProfile).where(UserProfile.name == SAMPLE_USER["name"])
            )
            user = user_result.scalar_one_or_none()
            if user is None:
                user = UserProfile(**SAMPLE_USER)
                session.add(user)
                await session.flush()

            print("Sample data already exists. Use --reset to replace it.\n")
            _print_summary(user.id, existing.id)
            return user.id, existing.id

        if reset:
            await _reset_sample_data(session)

        user = UserProfile(**SAMPLE_USER)
        product = Product(**SAMPLE_PRODUCT)
        session.add(user)
        session.add(product)
        await session.flush()

        for review_data in DEMO_REVIEWS:
            session.add(ProductReview(product_id=product.id, **review_data))

        await session.commit()
        await session.refresh(user)
        await session.refresh(product)

        _print_summary(user.id, product.id)
        return user.id, product.id


def _print_summary(user_id: int, product_id: int) -> None:
    print("Seed completed successfully!\n")
    print("Sample IDs for API testing:")
    print(f"  user_id    = {user_id}")
    print(f"  product_id = {product_id}\n")
    print("Test the recommendation endpoint:")
    print(
        '  curl -s -X POST http://localhost:8000/api/recommend \\\n'
        "    -H 'Content-Type: application/json' \\\n"
        f'    -d \'{{"user_id": {user_id}, "product_id": {product_id}}}\' | python3 -m json.tool'
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed SizeFitAI sample data")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing sample rows and insert fresh data",
    )
    args = parser.parse_args()

    try:
        asyncio.run(seed(reset=args.reset))
    except Exception as exc:
        print(f"Seed failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
