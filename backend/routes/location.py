from fastapi import APIRouter

from models.location import LocationCreate, LocationUpdate, LocationResponse
from controllers.location import (
    create_location,
    get_locations,
    get_location,
    update_location,
    delete_location,
)

router = APIRouter(
    prefix="/locations",
    tags=["Locations"]
)


@router.post("/", response_model=LocationResponse)
async def create(location: LocationCreate):
    return await create_location(location)


@router.get("/", response_model=list[LocationResponse])
async def get_all():
    return await get_locations()


@router.get("/{location_id}", response_model=LocationResponse)
async def get_one(location_id: str):
    return await get_location(location_id)


@router.put("/{location_id}", response_model=LocationResponse)
async def update(location_id: str, location: LocationUpdate):
    return await update_location(location_id, location)


@router.delete("/{location_id}")
async def delete(location_id: str):
    return await delete_location(location_id)
