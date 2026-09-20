from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi.concurrency import run_in_threadpool

from auth.repository import Account, AccountRepository
from auth.security import (
    DUMMY_PASSWORD_HASH,
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)


class InvalidCredentialsError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class AuthenticatedSession:
    account: Account
    token: str


class AuthService:
    def __init__(self, repository: AccountRepository, session_ttl_seconds: int) -> None:
        self._repository = repository
        self._session_ttl_seconds = session_ttl_seconds

    async def create_account(self, email: str, password: str) -> Account:
        normalized_email = self._normalize_email(email)
        encoded_password = await run_in_threadpool(hash_password, password)
        return await self._repository.create_account(normalized_email, encoded_password)

    async def login(self, email: str, password: str) -> AuthenticatedSession:
        normalized_email = self._normalize_email(email)
        account = await self._repository.find_account_by_email(normalized_email)
        encoded_password = account.password_hash if account is not None else DUMMY_PASSWORD_HASH
        password_is_valid = await run_in_threadpool(
            verify_password,
            password,
            encoded_password,
        )

        if account is None or not password_is_valid:
            raise InvalidCredentialsError

        token = generate_session_token()
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self._session_ttl_seconds)
        await self._repository.create_session(
            account.id,
            hash_session_token(token),
            expires_at,
        )
        return AuthenticatedSession(account=account, token=token)

    async def get_account_for_session(self, token: str) -> Account | None:
        return await self._repository.find_account_by_session_hash(hash_session_token(token))

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()
