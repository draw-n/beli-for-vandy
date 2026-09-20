from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from auth.repository import Account, AccountRepository
from auth.service import AuthService
from database import db
from settings import Settings, get_settings


def get_account_repository() -> AccountRepository:
    return AccountRepository(db)


def get_auth_service(
    repository: Annotated[AccountRepository, Depends(get_account_repository)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    return AuthService(repository, settings.session_ttl_seconds)


async def get_current_account(
    request: Request,
    service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Account:
    token = request.cookies.get(settings.session_cookie_name)
    account = await service.get_account_for_session(token) if token else None

    if account is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return account
