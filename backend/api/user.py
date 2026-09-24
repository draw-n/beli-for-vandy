from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from controllers.user import (
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserController,
)
from database import db
from models.user import User, UserCreate, UserDelete, UserResponse


router = APIRouter(prefix="/accounts", tags=["Accounts"])


def get_user_controller() -> UserController:
    return UserController(db)


def user_response(user: User) -> UserResponse:
    return UserResponse(
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        uuid=user.uuid,
        year_graduation=user.year_graduation,
        type=user.type,
        created_at=user.created_at,
        home_city=user.home_city,
    )


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account",
    description="Create a user profile with server-generated UUID and creation time.",
    responses={
        status.HTTP_409_CONFLICT: {
            "description": "An account already uses the supplied username or email address."
        },
    },
)
async def create_account(
    payload: UserCreate,
    controller: Annotated[UserController, Depends(get_user_controller)],
) -> UserResponse:
    try:
        user = await controller.create_user(payload)
    except UserAlreadyExistsError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that username or email already exists",
        ) from error

    return user_response(user)


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an account",
    description="Permanently delete an account after verifying its email address and password.",
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "description": "The supplied account credentials are incorrect."
        },
    },
)
async def delete_account(
    payload: UserDelete,
    controller: Annotated[UserController, Depends(get_user_controller)],
) -> None:
    try:
        await controller.delete_user(str(payload.email), payload.password)
    except InvalidCredentialsError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        ) from error
