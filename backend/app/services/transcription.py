import time
import httpx
from app.config import settings

BASE_URL = "https://api.assemblyai.com/v2"
HEADERS = {"authorization": settings.assemblyai_api_key}


def transcribe_audio(file_path: str) -> dict:
    """
    Sends audio to AssemblyAI for transcription + speaker diarization + summarization.
    Returns a dict with transcript, summary, key_points, and action_items.
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

    # Step 3: Poll for completion
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

    # Step 6: Build key points from utterances (extract main topic per speaker turn)
    key_points = _extract_key_points(utterances)

    # Step 7: Extract action items
    action_items = _extract_action_items(utterances)

    return {
        "transcript": transcript,
        "summary": summary,
        "key_points": key_points,
        "action_items": action_items,
    }


def _extract_key_points(utterances: list) -> list[str]:
    """Extract key discussion points from speaker utterances."""
    if not utterances:
        return ["Meeting transcribed successfully."]

    key_points = []
    for utterance in utterances:
        text = utterance.get("text", "").strip()
        speaker = utterance.get("speaker", "?")
        # Only include substantial utterances (more than 15 words)
        if len(text.split()) > 15:
            # Take first sentence as the key point
            first_sentence = text.split(".")[0].strip()
            if first_sentence and len(first_sentence.split()) > 5:
                key_points.append(f"Speaker {speaker}: {first_sentence}")

    # Deduplicate and limit to 6 points
    seen = set()
    unique = []
    for p in key_points:
        normalized = p.lower()[:50]
        if normalized not in seen:
            seen.add(normalized)
            unique.append(p)

    return unique[:6] if unique else ["Meeting transcribed successfully."]


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

    return action_items[:5]
