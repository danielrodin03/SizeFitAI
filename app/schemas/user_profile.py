from pydantic import BaseModel, Field

from app.models.enums import (
    BodyShape,
    BottomsFit,
    OuterwearFit,
    SizeLabel,
    TopsFit,
)


class UserProfileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    height_cm: float = Field(..., gt=0, le=300)
    weight_kg: float = Field(..., gt=0, le=500)
    zara_size: SizeLabel
    hm_size: SizeLabel
    asos_size: SizeLabel
    nike_size: SizeLabel
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
    zara_size: SizeLabel | None = None
    hm_size: SizeLabel | None = None
    asos_size: SizeLabel | None = None
    nike_size: SizeLabel | None = None
    tops_fit: TopsFit | None = None
    bottoms_fit: BottomsFit | None = None
    outerwear_fit: OuterwearFit | None = None
    body_shape: BodyShape | None = None


class UserProfileResponse(UserProfileBase):
    id: int

    model_config = {"from_attributes": True}
