from pydantic import BaseModel


class MeetingResponse(BaseModel):
    id: int
    title: str
    summary: str
    key_points: list[str]
    action_items: list[str]
    transcript: str


class MeetingRecord(BaseModel):
    id: int
    title: str
    summary: str
    key_points: list[str]
    action_items: list[str]
    transcript: str
    duration_seconds: int
    audio_filename: str | None = None
    tags: list[str] = []
    speaker_map: dict = {}
    created_at: str
