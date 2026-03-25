from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.database import (
    get_all_meetings, get_meeting, delete_meeting,
    rename_meeting, update_tags, update_speaker_map,
)
from app.models.meeting import MeetingRecord


class RenameRequest(BaseModel):
    title: str


class TagsRequest(BaseModel):
    tags: list[str]


class SpeakerMapRequest(BaseModel):
    speaker_map: dict


router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.get("", response_model=list[MeetingRecord])
async def list_meetings(
    search: str | None = Query(None, description="Search in title, summary, transcript"),
    date_from: str | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    tag: str | None = Query(None, description="Filter by tag"),
):
    return get_all_meetings(search=search, date_from=date_from, date_to=date_to, tag=tag)


@router.get("/{meeting_id}", response_model=MeetingRecord)
async def get_meeting_by_id(meeting_id: int):
    meeting = get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.patch("/{meeting_id}")
async def rename_meeting_by_id(meeting_id: int, body: RenameRequest):
    updated = rename_meeting(meeting_id, body.title)
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"detail": "Meeting renamed"}


@router.put("/{meeting_id}/tags")
async def update_meeting_tags(meeting_id: int, body: TagsRequest):
    updated = update_tags(meeting_id, body.tags)
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"detail": "Tags updated"}


@router.put("/{meeting_id}/speakers")
async def update_meeting_speakers(meeting_id: int, body: SpeakerMapRequest):
    updated = update_speaker_map(meeting_id, body.speaker_map)
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"detail": "Speaker map updated"}


@router.delete("/{meeting_id}")
async def delete_meeting_by_id(meeting_id: int):
    deleted = delete_meeting(meeting_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"detail": "Meeting deleted"}
