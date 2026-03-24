import json
import anthropic
from app.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are an AI meeting assistant. Analyze the provided meeting transcript and generate structured meeting notes.

Return your response as valid JSON with exactly this structure:
{
  "summary": "A concise 2-3 sentence summary of the meeting",
  "key_points": ["point 1", "point 2", ...],
  "action_items": ["action 1", "action 2", ...]
}

Rules:
- Summary should capture the main topics and decisions
- Key points should be specific and actionable, not vague
- Action items should include the speaker/person responsible if mentioned
- If no clear action items exist, return an empty list
- Return ONLY the JSON, no other text"""


async def summarize_transcript(transcript: str) -> dict:
    """
    Sends transcript to Claude API for summarization.
    Returns dict with summary, key_points, action_items.
    """
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Here is the meeting transcript:\n\n{transcript}\n\nGenerate structured meeting notes.",
            }
        ],
    )

    response_text = message.content[0].text

    # Parse JSON from response, with fallback for markdown-wrapped output
    try:
        result = json.loads(response_text)
    except json.JSONDecodeError:
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0]
        result = json.loads(cleaned)

    return result
