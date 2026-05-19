from pydantic import BaseModel, Field

from app.models.enums import (
    BodyShape,
    BottomsFit,
    OuterwearFit,
    TopsFit,
)


class UserProfileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    height_cm: float = Field(..., gt=0, le=300)
    weight_kg: float = Field(..., gt=0, le=500)
    benchmark_brand: str | None = Field(None, max_length=128)
    benchmark_size: str | None = Field(None, max_length=32)
    zara_size: str = Field(..., min_length=1, max_length=32)
    hm_size: str = Field(..., min_length=1, max_length=32)
    asos_size: str = Field(..., min_length=1, max_length=32)
    nike_size: str = Field(..., min_length=1, max_length=32)
    tops_fit: TopsFit = TopsFit.REGULAR
    bottoms_fit: BottomsFit = BottomsFit.STRAIGHT
    outerwear_fit: OuterwearFit = OuterwearFit.REGULAR
    body_shape: BodyShape = BodyShape.STANDARD


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    height_cm: float | None = Field(None, gt=0, le=300)
    weight_kg: float | None = Field(None, gt=0, le=500)
    benchmark_brand: str | None = Field(None, max_length=128)
    benchmark_size: str | None = Field(None, max_length=32)
    zara_size: str | None = Field(None, min_length=1, max_length=32)
    hm_size: str | None = Field(None, min_length=1, max_length=32)
    asos_size: str | None = Field(None, min_length=1, max_length=32)
    nike_size: str | None = Field(None, min_length=1, max_length=32)
    tops_fit: TopsFit | None = None
    bottoms_fit: BottomsFit | None = None
    outerwear_fit: OuterwearFit | None = None
    body_shape: BodyShape | None = None


class UserProfileResponse(UserProfileBase):
    id: int

    model_config = {"from_attributes": True}
