from typing import Annotated

from fastapi import APIRouter, Depends, status

from controllers.auth import get_current_user_id
from controllers.favorite_dish import (
    add_favorite_dish,
    get_favorite_dishes,
    remove_favorite_dish,
)
from models.favorite_dish import FavoriteDishCreate, FavoriteDishResponse


router = APIRouter(prefix="/favorite-dishes", tags=["Favorite dishes"])


@router.get("/", response_model=list[FavoriteDishResponse])
async def get_all(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
):
    return await get_favorite_dishes(current_user_id)


@router.post("/", response_model=FavoriteDishResponse)
async def create(
    favorite_dish: FavoriteDishCreate,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
):
    return await add_favorite_dish(current_user_id, favorite_dish)


@router.delete("/{dish_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    dish_id: str,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
):
    await remove_favorite_dish(current_user_id, dish_id)
