from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import EmailStr

from controllers.user import (
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserController,
)
from database import db
from models.user import StoredUser, UserCreate, UserLogin, UserResponse


router = APIRouter(prefix="/accounts", tags=["Accounts"])


def get_user_controller() -> UserController:
    return UserController(db)


def user_response(user: StoredUser) -> UserResponse:
    return UserResponse.model_validate(user, from_attributes=True)


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


@router.post(
    "/login",
    response_model=UserResponse,
    summary="Log in to an account",
    description="Verify a username and password against a stored account.",
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "description": "The supplied account credentials are incorrect."
        },
    },
)
async def login(
    payload: UserLogin,
    controller: Annotated[UserController, Depends(get_user_controller)],
) -> UserResponse:
    try:
        user = await controller.authenticate_user(payload.username, payload.password)
    except InvalidCredentialsError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
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
    email: Annotated[EmailStr, Body()],
    password: Annotated[str, Body(min_length=1)],
    controller: Annotated[UserController, Depends(get_user_controller)],
) -> None:
    try:
        await controller.delete_user(str(email), password)
    except InvalidCredentialsError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        ) from error
