from pydantic import BaseModel, Field


class ProductResolveRequest(BaseModel):
    external_product_id: str = Field(..., min_length=1, max_length=128)
    brand: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=512)
    link: str = Field(..., min_length=1, max_length=2048)
    page_text: str | None = Field(
        None,
        max_length=8000,
        description="Visible page text for universal fit parsing",
    )


class ProductResolveResponse(BaseModel):
    product_id: int
    external_product_id: str
    brand: str
    name: str
    review_count: int
    has_reviews: bool
    has_page_context: bool = False
    parsed_from_page: bool = False
    created: bool = False
    demo_reviews_added: bool = False
