from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.product import Product
from app.models.product_review import ProductReview
from app.schemas.product import ProductResolveRequest, ProductResolveResponse
from app.services.demo_data import ensure_demo_reviews

router = APIRouter(prefix="/api/products", tags=["products"])


@router.post("/resolve", response_model=ProductResolveResponse)
async def resolve_product(
    body: ProductResolveRequest,
    db: AsyncSession = Depends(get_db),
) -> ProductResolveResponse:
    page_text = (body.page_text or "").strip() or None
    brand = body.brand.strip()
    name = body.name.strip()

    result = await db.execute(
        select(Product)
        .where(Product.external_product_id == body.external_product_id)
        .options(selectinload(Product.reviews))
    )
    product = result.scalar_one_or_none()
    created = False
    demo_reviews_added = False

    if product is None:
        product = Product(
            external_product_id=body.external_product_id,
            brand=brand,
            name=name,
            link=body.link,
            page_context=page_text,
        )
        db.add(product)
        await db.commit()
        await db.refresh(product)
        created = True
        review_count = 0
    else:
        product.brand = brand
        product.name = name
        product.link = body.link
        if page_text:
            product.page_context = page_text
        await db.commit()
        await db.refresh(product)

        count_result = await db.execute(
            select(func.count())
            .select_from(ProductReview)
            .where(ProductReview.product_id == product.id)
        )
        review_count = count_result.scalar_one()

    use_page = bool(product.page_context)
    if settings.demo_mode and review_count == 0 and not use_page:
        review_count = await ensure_demo_reviews(db, product.id)
        demo_reviews_added = True

    return ProductResolveResponse(
        product_id=product.id,
        external_product_id=product.external_product_id,
        brand=product.brand,
        name=product.name,
        review_count=review_count,
        has_reviews=review_count > 0,
        has_page_context=use_page,
        parsed_from_page=use_page and review_count == 0,
        created=created,
        demo_reviews_added=demo_reviews_added,
    )
