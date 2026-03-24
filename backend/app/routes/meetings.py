from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.database import get_all_meetings, get_meeting, delete_meeting, rename_meeting
from app.models.meeting import MeetingRecord


class RenameRequest(BaseModel):
    title: str

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.get("", response_model=list[MeetingRecord])
async def list_meetings():
    return get_all_meetings()


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


@router.delete("/{meeting_id}")
async def delete_meeting_by_id(meeting_id: int):
    deleted = delete_meeting(meeting_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"detail": "Meeting deleted"}
