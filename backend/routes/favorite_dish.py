from typing import Annotated

from fastapi import APIRouter, Depends, status

from controllers.auth import require_user
from controllers.favorite_dish import (
    add_favorite_dish,
    get_favorite_dishes,
    remove_favorite_dish,
)
from models.favorite_dish import FavoriteDishCreate, FavoriteDishResponse
from models.user import StoredUser


router = APIRouter(prefix="/favorite-dishes", tags=["Favorite dishes"])


@router.get("/", response_model=list[FavoriteDishResponse])
async def get_all(
    current_user: Annotated[StoredUser, Depends(require_user)],
):
    return await get_favorite_dishes(current_user.uuid)


@router.post("/", response_model=FavoriteDishResponse)
async def create(
    favorite_dish: FavoriteDishCreate,
    current_user: Annotated[StoredUser, Depends(require_user)],
):
    return await add_favorite_dish(current_user.uuid, favorite_dish)


@router.delete("/{dish_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    dish_id: str,
    current_user: Annotated[StoredUser, Depends(require_user)],
):
    await remove_favorite_dish(current_user.uuid, dish_id)
