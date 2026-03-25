import time
import httpx
from app.config import settings

BASE_URL = "https://api.assemblyai.com/v2"
HEADERS = {"authorization": settings.assemblyai_api_key}

MAX_POLL_TIMEOUT = 2700  # 45 minutes max polling time


def transcribe_audio(file_path: str) -> dict:
    """
    Sends audio to AssemblyAI for transcription + speaker diarization + summarization.
    Returns a dict with transcript, summary, key_points, and action_items.
    Handles large files (up to 250 MB) with retry logic and exponential backoff.
    """
    # Step 1: Upload the audio file (with retry)
    audio_url = _upload_with_retry(file_path, max_retries=2)

    # Step 2: Create transcription request with summarization
    transcript_resp = httpx.post(
        f"{BASE_URL}/transcript",
        headers=HEADERS,
        json={
            "audio_url": audio_url,
            "speaker_labels": True,
            "speech_models": ["universal-3-pro", "universal-2"],
            "summarization": True,
            "summary_model": "informative",
            "summary_type": "paragraph",
        },
        timeout=30,
    )
    transcript_resp.raise_for_status()
    transcript_id = transcript_resp.json()["id"]

    # Step 3: Poll for completion with exponential backoff
    data = _poll_with_backoff(transcript_id)

    # Step 4: Build speaker-labeled transcript
    utterances = data.get("utterances", [])
    if utterances:
        lines = []
        for utterance in utterances:
            speaker = utterance.get("speaker", "Unknown")
            text = utterance.get("text", "")
            lines.append(f"Speaker {speaker}:\n{text}\n")
        transcript = "\n".join(lines)
    else:
        transcript = data.get("text", "No transcript available.")

    # Step 5: Get paragraph summary from AssemblyAI
    summary = data.get("summary", "")
    if not summary:
        summary = "No summary available for this recording."

    # Step 6: Build key points and action items
    key_points = _extract_key_points(utterances)
    action_items = _extract_action_items(utterances)

    return {
        "transcript": transcript,
        "summary": summary,
        "key_points": key_points,
        "action_items": action_items,
    }


def _upload_with_retry(file_path: str, max_retries: int = 2) -> str:
    """Upload audio file to AssemblyAI with retry logic."""
    last_error = None
    for attempt in range(max_retries + 1):
        try:
            with open(file_path, "rb") as f:
                upload_resp = httpx.post(
                    f"{BASE_URL}/upload",
                    headers=HEADERS,
                    content=f,
                    timeout=600,  # 10 minutes for large files
                )
            upload_resp.raise_for_status()
            return upload_resp.json()["upload_url"]
        except Exception as e:
            last_error = e
            if attempt < max_retries:
                wait = (attempt + 1) * 5  # 5s, 10s
                print(f"Upload attempt {attempt + 1} failed, retrying in {wait}s: {e}")
                time.sleep(wait)
    raise Exception(f"Upload failed after {max_retries + 1} attempts: {last_error}")


def _poll_with_backoff(transcript_id: str) -> dict:
    """Poll AssemblyAI for transcription completion with exponential backoff."""
    elapsed = 0
    poll_count = 0

    while elapsed < MAX_POLL_TIMEOUT:
        # Exponential backoff: 5s → 10s → 15s
        if elapsed < 60:
            interval = 5
        elif elapsed < 300:
            interval = 10
        else:
            interval = 15

        time.sleep(interval)
        elapsed += interval
        poll_count += 1

        try:
            poll_resp = httpx.get(
                f"{BASE_URL}/transcript/{transcript_id}",
                headers=HEADERS,
                timeout=30,
            )
            poll_resp.raise_for_status()
            data = poll_resp.json()
        except Exception as e:
            print(f"Poll #{poll_count} failed (elapsed: {elapsed}s): {e}")
            continue  # Don't fail on a single poll error

        status = data.get("status")
        if status == "completed":
            print(f"Transcription completed after {elapsed}s ({poll_count} polls)")
            return data
        elif status == "error":
            raise Exception(f"Transcription failed: {data.get('error', 'Unknown error')}")

        print(f"Poll #{poll_count}: status={status}, elapsed={elapsed}s, next in {interval}s")

    raise Exception(f"Transcription timed out after {MAX_POLL_TIMEOUT}s ({poll_count} polls)")


def _extract_key_points(utterances: list) -> list[str]:
    """Extract key discussion points from speaker utterances."""
    if not utterances:
        return ["Meeting transcribed successfully."]

    key_points = []
    for utterance in utterances:
        text = utterance.get("text", "").strip()
        speaker = utterance.get("speaker", "?")
        if len(text.split()) > 15:
            first_sentence = text.split(".")[0].strip()
            if first_sentence and len(first_sentence.split()) > 5:
                key_points.append(f"Speaker {speaker}: {first_sentence}")

    seen = set()
    unique = []
    for p in key_points:
        normalized = p.lower()[:50]
        if normalized not in seen:
            seen.add(normalized)
            unique.append(p)

    return unique[:8] if unique else ["Meeting transcribed successfully."]


def _extract_action_items(utterances: list) -> list[str]:
    """Extract action items from utterances containing action words."""
    action_words = ["should", "need to", "must", "will do", "going to",
                    "plan to", "agreed to", "decided to", "let's", "follow up",
                    "make sure", "don't forget", "remember to"]

    action_items = []
    for utterance in utterances:
        text = utterance.get("text", "").strip()
        speaker = utterance.get("speaker", "?")

        for sentence in text.split("."):
            sentence = sentence.strip()
            if sentence and any(word in sentence.lower() for word in action_words):
                if len(sentence.split()) > 4:
                    action_items.append(f"Speaker {speaker}: {sentence}")

    return action_items[:8]
