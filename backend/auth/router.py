from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from auth.dependencies import get_auth_service, get_current_account
from auth.repository import Account, AccountAlreadyExistsError
from auth.schemas import AccountCreate, AccountLogin, AccountResponse
from auth.service import AuthService, InvalidCredentialsError
from settings import Settings, get_settings


router = APIRouter(prefix="/auth", tags=["auth"])


def account_response(account: Account) -> AccountResponse:
    return AccountResponse(
        id=account.id,
        email=account.email,
        created_at=account.created_at,
    )


@router.post("/signup", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: AccountCreate,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> AccountResponse:
    try:
        account = await service.create_account(str(payload.email), payload.password)
    except AccountAlreadyExistsError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists",
        ) from error

    return account_response(account)


@router.post("/login", response_model=AccountResponse)
async def login(
    payload: AccountLogin,
    response: Response,
    service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AccountResponse:
    try:
        session = await service.login(str(payload.email), payload.password)
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
    return account_response(session.account)


@router.get("/me", response_model=AccountResponse)
async def get_me(
    account: Annotated[Account, Depends(get_current_account)],
) -> AccountResponse:
    return account_response(account)
