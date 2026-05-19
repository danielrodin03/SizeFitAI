from pydantic import BaseModel, Field


class RecommendRequest(BaseModel):
    user_id: int = Field(..., gt=0, description="Internal user profile ID")
    product_id: int = Field(..., gt=0, description="Internal product ID")


class RecommendResponse(BaseModel):
    recommended_size: str = Field(..., examples=["L"])
    confidence_score: int = Field(..., ge=1, le=100)
    is_demo: bool = Field(
        default=False,
        description="True when returning a mock/demo recommendation",
    )
    reasoning: str = Field(
        ...,
        description="Short explanation in English",
        examples=[
            "80% of reviewers say this runs tight in the shoulders. "
            "Given your usual Zara size M and preference for regular tops, "
            "we recommend size L."
        ],
    )
