from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import BodyShape, BottomsFit, OuterwearFit, TopsFit


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)

    benchmark_brand: Mapped[str | None] = mapped_column(String(128), nullable=True)
    benchmark_size: Mapped[str | None] = mapped_column(String(8), nullable=True)

    zara_size: Mapped[str] = mapped_column(String(8), nullable=False)
    hm_size: Mapped[str] = mapped_column(String(8), nullable=False)
    asos_size: Mapped[str] = mapped_column(String(8), nullable=False)
    nike_size: Mapped[str] = mapped_column(String(8), nullable=False)

    tops_fit: Mapped[TopsFit] = mapped_column(
        Enum(TopsFit, name="tops_fit", native_enum=False),
        nullable=False,
        default=TopsFit.REGULAR,
    )
    bottoms_fit: Mapped[BottomsFit] = mapped_column(
        Enum(BottomsFit, name="bottoms_fit", native_enum=False),
        nullable=False,
        default=BottomsFit.STRAIGHT,
    )
    outerwear_fit: Mapped[OuterwearFit] = mapped_column(
        Enum(OuterwearFit, name="outerwear_fit", native_enum=False),
        nullable=False,
        default=OuterwearFit.REGULAR,
    )
    body_shape: Mapped[BodyShape] = mapped_column(
        Enum(BodyShape, name="body_shape", native_enum=False),
        nullable=False,
        default=BodyShape.STANDARD,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
