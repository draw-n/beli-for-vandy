from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import EmailStr

from controllers.user import (
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserController,
)
from controllers.auth import AuthConfigurationError, get_signing_secret, issue_access_token
from database import db
from models.user import LoginResponse, StoredUser, UserCreate, UserLogin, UserResponse


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

@router.get(
    "",
    response_model=list[UserResponse],
    summary="Get all accounts",
    description="Return public account information for all users.",
)
async def get_accounts(
    controller: Annotated[
        UserController,
        Depends(get_user_controller)
    ],
) -> list[UserResponse]:
    users = await controller.get_users()

    return [
        user_response(user)
        for user in users
    ]

@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Log in to an account",
    description="Verify credentials and issue a signed bearer token valid for 15 minutes.",
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "description": "The supplied account credentials are incorrect."
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "description": "Token signing is unavailable because the secret is not configured."
        },
    },
)
async def login(
    payload: UserLogin,
    controller: Annotated[UserController, Depends(get_user_controller)],
) -> LoginResponse:
    try:
        user = await controller.authenticate_user(payload.username, payload.password)
    except InvalidCredentialsError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        ) from error

    try:
        secret = get_signing_secret()
    except AuthConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        ) from error

    access_token, expires_at = issue_access_token(user.uuid, secret)
    return LoginResponse(
        **user_response(user).model_dump(),
        access_token=access_token,
        token_type="bearer",
        expires_at=expires_at,
    )


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
