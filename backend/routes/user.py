from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import EmailStr

from controllers.user import (
    InvalidRoleChangeError,
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserController,
)
from controllers.auth import (
    AuthConfigurationError,
    get_current_user,
    issue_access_token,
    get_signing_secret,
    require_admin,
)
from database import db
from models.user import (
    LoginResponse,
    PrivilegeChange,
    StoredUser,
    UserCreate,
    UserLogin,
    UserResponse,
)


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
    _: Annotated[StoredUser, Depends(require_admin)],
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

    access_token, expires_at = issue_access_token(
        user.uuid,
        secret,
        user.security_version,
    )
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
    current_user: Annotated[StoredUser, Depends(get_current_user)],
) -> None:
    try:
        await controller.delete_user(current_user.uuid, str(email), password)
    except InvalidCredentialsError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        ) from error


admin_router = APIRouter(prefix="/admin", tags=["Administration"])


async def _change_role(
    target_uuid: str,
    role: str,
    payload: PrivilegeChange,
    controller: UserController,
    current_user: StoredUser,
) -> UserResponse:
    try:
        user = await controller.change_role(
            target_uuid,
            role,
            current_user.uuid,
            payload.password,
        )
    except InvalidRoleChangeError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Privilege change is invalid or the confirmation password is incorrect",
        ) from error
    return user_response(user)


@admin_router.post(
    "/accounts/{user_uuid}/promote-moderator",
    response_model=UserResponse,
    summary="Promote an account to moderator",
)
async def promote_moderator(
    user_uuid: str,
    payload: PrivilegeChange,
    controller: Annotated[UserController, Depends(get_user_controller)],
    current_user: Annotated[StoredUser, Depends(require_admin)],
) -> UserResponse:
    return await _change_role(user_uuid, "moderator", payload, controller, current_user)


@admin_router.post(
    "/accounts/{user_uuid}/demote-moderator",
    response_model=UserResponse,
    summary="Demote an account to regular user",
)
async def demote_moderator(
    user_uuid: str,
    payload: PrivilegeChange,
    controller: Annotated[UserController, Depends(get_user_controller)],
    current_user: Annotated[StoredUser, Depends(require_admin)],
) -> UserResponse:
    return await _change_role(user_uuid, "user", payload, controller, current_user)


@admin_router.post(
    "/accounts/{user_uuid}/promote-admin",
    response_model=UserResponse,
    summary="Promote an account to administrator",
)
async def promote_admin(
    user_uuid: str,
    payload: PrivilegeChange,
    controller: Annotated[UserController, Depends(get_user_controller)],
    current_user: Annotated[StoredUser, Depends(require_admin)],
) -> UserResponse:
    return await _change_role(user_uuid, "admin", payload, controller, current_user)


@admin_router.post(
    "/accounts/{user_uuid}/demote-admin",
    response_model=UserResponse,
    summary="Demote an administrator",
)
async def demote_admin(
    user_uuid: str,
    payload: PrivilegeChange,
    controller: Annotated[UserController, Depends(get_user_controller)],
    current_user: Annotated[StoredUser, Depends(require_admin)],
) -> UserResponse:
    return await _change_role(user_uuid, "user", payload, controller, current_user)
