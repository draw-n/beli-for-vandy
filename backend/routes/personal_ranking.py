from typing import Annotated

from fastapi import APIRouter, Depends

from controllers.auth import get_current_user_id
from controllers.personal_ranking import get_friend_rankings, get_rankings, upsert_ranking
from models.personal_ranking import PersonalRankingResponse, PersonalRankingUpsert, RankedEntry, RankingsResponse

router = APIRouter(prefix="/personal-rankings", tags=["Personal rankings"])


@router.get("/", response_model=RankingsResponse)
async def get_my_rankings(uid: Annotated[str, Depends(get_current_user_id)]) -> RankingsResponse:
    return await get_rankings(uid)


@router.get("/users/{user_id}", response_model=list[RankedEntry])
async def get_user_rankings(
    user_id: str,
    _uid: Annotated[str, Depends(get_current_user_id)],
) -> list[RankedEntry]:
    """Return the ranked dining halls for any user. Requires authentication."""
    return await get_friend_rankings(user_id)


@router.put("/{location_id}", response_model=PersonalRankingResponse)
async def set_my_ranking(
    location_id: str,
    payload: PersonalRankingUpsert,
    uid: Annotated[str, Depends(get_current_user_id)],
) -> PersonalRankingResponse:
    """Create or update the authenticated user's rating for a dining hall.

    If a rating already exists for this location, only rating and updated_at
    are changed; created_at and uuid are preserved from the original document.
    """
    return await upsert_ranking(uid, location_id, payload)
