from typing import Annotated

from fastapi import APIRouter, Depends

from controllers.auth import get_current_user_id
from controllers.personal_ranking import get_rankings, upsert_ranking
from models.personal_ranking import PersonalRankingResponse, PersonalRankingUpsert, RankingsResponse

router = APIRouter(prefix="/personal-rankings", tags=["Personal rankings"])


@router.get("/", response_model=RankingsResponse)
async def get_my_rankings(uid: Annotated[str, Depends(get_current_user_id)]) -> RankingsResponse:
    return await get_rankings(uid)


@router.put("/{location_id}", response_model=PersonalRankingResponse)
async def set_my_ranking(
    location_id: str,
    payload: PersonalRankingUpsert,
    uid: Annotated[str, Depends(get_current_user_id)],
) -> PersonalRankingResponse:
    return await upsert_ranking(uid, location_id, payload)
