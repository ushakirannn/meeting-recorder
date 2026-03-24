import httpx
from app.config import settings

BASE_URL = "https://api.assemblyai.com/v2"
HEADERS = {"authorization": settings.assemblyai_api_key}


def transcribe_audio(file_path: str) -> str:
    """
    Sends audio to AssemblyAI for transcription + speaker diarization.
    Returns a speaker-labeled transcript string.

    Uses the REST API directly because the SDK doesn't support
    the new speech_models parameter yet.
    """
    # Step 1: Upload the audio file
    with open(file_path, "rb") as f:
        upload_resp = httpx.post(
            f"{BASE_URL}/upload",
            headers=HEADERS,
            content=f,
            timeout=300,
        )
    upload_resp.raise_for_status()
    audio_url = upload_resp.json()["upload_url"]

    # Step 2: Create transcription request
    transcript_resp = httpx.post(
        f"{BASE_URL}/transcript",
        headers=HEADERS,
        json={
            "audio_url": audio_url,
            "speaker_labels": True,
            "speech_models": ["universal-3-pro", "universal-2"],
        },
        timeout=30,
    )
    transcript_resp.raise_for_status()
    transcript_id = transcript_resp.json()["id"]

    # Step 3: Poll for completion
    import time
    while True:
        poll_resp = httpx.get(
            f"{BASE_URL}/transcript/{transcript_id}",
            headers=HEADERS,
            timeout=30,
        )
        poll_resp.raise_for_status()
        data = poll_resp.json()

        if data["status"] == "completed":
            break
        elif data["status"] == "error":
            raise Exception(f"Transcription failed: {data.get('error', 'Unknown error')}")

        time.sleep(3)

    # Step 4: Build speaker-labeled transcript from utterances
    utterances = data.get("utterances", [])
    if not utterances:
        return data.get("text", "No transcript available.")

    lines = []
    for utterance in utterances:
        speaker = utterance.get("speaker", "Unknown")
        text = utterance.get("text", "")
        lines.append(f"Speaker {speaker}:\n{text}\n")

    return "\n".join(lines)
