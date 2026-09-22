from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from controllers.user import (
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserController,
)
from database import db
from models.user import User, UserCreate, UserLogin, UserResponse
from settings import Settings, get_settings


router = APIRouter(prefix="/auth", tags=["auth"])


def get_user_controller(
    settings: Annotated[Settings, Depends(get_settings)],
) -> UserController:
    return UserController(db, settings.session_ttl_seconds)


async def get_current_user(
    request: Request,
    controller: Annotated[UserController, Depends(get_user_controller)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    token = request.cookies.get(settings.session_cookie_name)
    user = await controller.get_user_for_session(token) if token else None

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return user


def user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        created_at=user.created_at,
    )


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: UserCreate,
    controller: Annotated[UserController, Depends(get_user_controller)],
) -> UserResponse:
    try:
        user = await controller.create_user(str(payload.email), payload.password)
    except UserAlreadyExistsError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists",
        ) from error

    return user_response(user)


@router.post("/login", response_model=UserResponse)
async def login(
    payload: UserLogin,
    response: Response,
    controller: Annotated[UserController, Depends(get_user_controller)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> UserResponse:
    try:
        session = await controller.login(str(payload.email), payload.password)
    except InvalidCredentialsError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        ) from error

    response.set_cookie(
        key=settings.session_cookie_name,
        value=session.token,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )
    return user_response(session.user)


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return user_response(user)
