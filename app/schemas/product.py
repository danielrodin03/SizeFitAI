from pydantic import BaseModel, Field


class ProductResolveRequest(BaseModel):
    external_product_id: str = Field(..., min_length=1, max_length=128)
    brand: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=512)
    link: str = Field(..., min_length=1, max_length=2048)


class ProductResolveResponse(BaseModel):
    product_id: int
    external_product_id: str
    brand: str
    name: str
    review_count: int
    has_reviews: bool
    created: bool = False
    demo_reviews_added: bool = False
