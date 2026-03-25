import os
import asyncio
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from app.config import settings
from app.services.transcription import transcribe_audio
from app.services.database import save_meeting, get_meeting
from app.models.meeting import MeetingResponse

router = APIRouter()

ALLOWED_EXTENSIONS = {".wav", ".m4a", ".ogg", ".webm", ".mp3", ".aac", ".flac"}
RECORDINGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "recordings")


@router.post("/upload-audio", response_model=MeetingResponse)
async def upload_audio(
    file: UploadFile = File(...),
    duration_seconds: int = Form(default=0),
):
    # Validate file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {ext}. Accepted: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Ensure directories exist
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(RECORDINGS_DIR, exist_ok=True)

    file_path = os.path.join(settings.upload_dir, file.filename)

    try:
        # Save uploaded file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Check file size
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        if file_size_mb > settings.max_file_size_mb:
            raise HTTPException(
                status_code=413,
                detail=f"File too large ({file_size_mb:.1f} MB). Max: {settings.max_file_size_mb} MB",
            )

        # Step 1: Transcription + diarization + summarization via AssemblyAI
        try:
            result = await asyncio.to_thread(transcribe_audio, file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

        # Step 2: Save audio to recordings folder
        audio_filename = f"{uuid.uuid4().hex}{ext}"
        recording_path = os.path.join(RECORDINGS_DIR, audio_filename)
        shutil.copy2(file_path, recording_path)

        # Step 3: Save to database
        from datetime import datetime
        title = f"Meeting — {datetime.now().strftime('%b %d, %Y %I:%M %p')}"
        meeting_id = save_meeting(
            title=title,
            summary=result["summary"],
            key_points=result["key_points"],
            action_items=result["action_items"],
            transcript=result["transcript"],
            duration_seconds=duration_seconds,
            audio_filename=audio_filename,
        )

        return MeetingResponse(
            id=meeting_id,
            title=title,
            summary=result["summary"],
            key_points=result["key_points"],
            action_items=result["action_items"],
            transcript=result["transcript"],
        )

    finally:
        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)


@router.get("/recordings/{meeting_id}")
async def stream_recording(meeting_id: int):
    meeting = get_meeting(meeting_id)
    if not meeting or not meeting.get("audio_filename"):
        raise HTTPException(status_code=404, detail="Recording not found")

    audio_path = os.path.join(RECORDINGS_DIR, meeting["audio_filename"])
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    ext = os.path.splitext(meeting["audio_filename"])[1].lower()
    media_types = {
        ".m4a": "audio/mp4",
        ".mp4": "audio/mp4",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".webm": "audio/webm",
        ".aac": "audio/aac",
        ".flac": "audio/flac",
    }
    media_type = media_types.get(ext, "audio/mpeg")

    return FileResponse(audio_path, media_type=media_type)
