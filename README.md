# AI Meeting Recorder

A mobile app that records in-person office meetings and automatically generates structured meeting notes using AI.

Place your phone in the center of the meeting room, hit record, and get:
- Speaker-separated transcript
- Meeting summary
- Key discussion points
- Action items

## Architecture

```
Mobile App (Ionic Angular + Capacitor)
  ↓ uploads audio
FastAPI Backend
  ↓
AssemblyAI (transcription + speaker diarization)
  ↓
Claude API (summarization)
  ↓
Structured JSON response → displayed in app
```

## Prerequisites

- Node.js 18+
- Python 3.11+
- Android Studio (for Android builds)
- API Keys:
  - [AssemblyAI](https://www.assemblyai.com/) - transcription + speaker diarization
  - [Anthropic](https://console.anthropic.com/) - Claude API for summarization

## Setup & Run

### Backend

```bash
# Create and activate virtual environment
cd "Meeting Recorder"
python -m venv backend-venv

# Windows
backend-venv\Scripts\activate

# macOS/Linux
source backend-venv/bin/activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env with your actual API keys

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --timeout-keep-alive 300
```

Test: `curl http://localhost:8000/health`

### Mobile App

```bash
cd mobile-app

# Install dependencies
npm install

# Run in browser (for testing)
ionic serve

# Build for Android
ionic build
npx cap sync android
npx cap open android   # Opens in Android Studio
```

### Testing on Android Device

1. Connect your phone via USB with USB debugging enabled
2. Run `adb reverse tcp:8000 tcp:8000` to tunnel backend
3. Build and run from Android Studio

### Build APK

```bash
cd mobile-app
ionic build --prod
npx cap sync android
cd android
.\gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

## API

### POST /upload-audio

Upload meeting audio and receive structured notes.

**Request:** multipart/form-data with `file` field (WAV, M4A, OGG, WEBM, MP3)

**Response:**
```json
{
  "summary": "Discussion about dashboard improvements...",
  "key_points": ["dashboard performance issues identified", "deployment planned next week"],
  "action_items": ["Usha: benchmark dashboard performance"],
  "transcript": "Speaker A:\nWe should improve dashboard performance.\n\nSpeaker B:\n..."
}
```

### GET /health

Returns `{"status": "ok"}`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ASSEMBLYAI_API_KEY` | AssemblyAI API key for transcription + diarization |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude summarization |

## Tech Stack

- **Mobile:** Ionic 7 + Angular 19 + Capacitor 7
- **Backend:** Python 3.11 + FastAPI
- **AI:** AssemblyAI (transcription + diarization) + Claude API (summarization)
