from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user_profile import UserProfile
from app.schemas.user_profile import (
    UserProfileCreate,
    UserProfileResponse,
    UserProfileUpdate,
)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    body: UserProfileCreate,
    db: AsyncSession = Depends(get_db),
) -> UserProfile:
    user = UserProfile(**body.model_dump())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> UserProfile:
    user = await _get_user_or_404(db, user_id)
    return user


@router.put("/{user_id}", response_model=UserProfileResponse)
async def update_user_profile(
    user_id: int,
    body: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
) -> UserProfile:
    user = await _get_user_or_404(db, user_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


async def _get_user_or_404(db: AsyncSession, user_id: int) -> UserProfile:
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User profile {user_id} not found",
        )
    return user
