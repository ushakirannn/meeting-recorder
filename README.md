# AI Meeting Recorder

A mobile app that records in-person office meetings and automatically generates structured meeting notes using AI.

Place your phone in the center of the meeting room, hit record, and get:
- Speaker-separated transcript
- Meeting summary
- Key discussion points
- Action items

## Features

- Start/stop meeting recording with a large animated button
- AI-powered transcription with speaker diarization (AssemblyAI)
- Meeting notes: summary, key points, action items, transcript
- Audio playback for past recordings
- Meeting history with rename and delete
- Bottom tab navigation (Home, Meetings, Settings)
- Modern UI with glassmorphism design

## Architecture

```
Mobile App (Ionic Angular + Capacitor)
  ↓ records audio, uploads to backend
FastAPI Backend
  ↓
AssemblyAI (transcription + speaker diarization)
  ↓
SQLite (meeting storage + audio files)
  ↓
Structured JSON response → displayed in app
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | Ionic 7 + Angular 19 + Capacitor 7 |
| Backend | Python 3.11 + FastAPI |
| AI Transcription | AssemblyAI (universal-3-pro) |
| Database | SQLite |
| Hosting | Railway |

## Prerequisites

- Node.js 18+
- Python 3.11+
- Ionic CLI (`npm install -g @ionic/cli`)
- Android Studio (for Android builds)
- API Keys:
  - [AssemblyAI](https://www.assemblyai.com/) — transcription + speaker diarization (185 hours free)
  - [Anthropic](https://console.anthropic.com/) — Claude API for summarization (optional)

## Setup & Run

### Backend

```bash
# Create and activate virtual environment
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
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 --timeout-keep-alive 300
```

Test: `curl http://localhost:8001/health`

### Mobile App (Browser Testing)

```bash
cd mobile-app

# Install dependencies
npm install

# Run in browser
ionic serve
```

App opens at `http://localhost:8100`

### Testing on Android Device (Local Backend)

1. Connect your phone via USB with USB debugging enabled
2. Run `adb reverse tcp:8001 tcp:8001` to tunnel the backend
3. Build and run from Android Studio

## Building the Android APK

### Step 1: Build the web app

```bash
cd mobile-app

# Remove old build artifacts
Remove-Item -Recurse -Force www    # PowerShell
# or: rm -rf www                   # Bash

# Build the production web app
npm run build
```

### Step 2: Sync with Android

```bash
npx cap sync android
npx cap copy android
```

### Step 3: Open in Android Studio

```bash
npx cap open android
```

### Step 4: Build in Android Studio

1. Wait for **Gradle sync** to complete (progress bar at bottom)
2. **Build → Clean Project**
3. **Build → Rebuild Project**
4. **Build → Build Bundle(s) / APK(s) → Build APK(s)**

The debug APK will be generated at:
```
mobile-app/android/app/build/outputs/apk/debug/app-debug.apk
```

You can install this APK directly on any Android device by transferring the file and opening it.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/upload-audio` | Upload audio, returns transcription + notes |
| GET | `/meetings` | List all saved meetings |
| GET | `/meetings/:id` | Get a single meeting |
| PATCH | `/meetings/:id` | Rename a meeting |
| DELETE | `/meetings/:id` | Delete a meeting + audio file |
| GET | `/recordings/:id` | Stream audio recording for a meeting |

### POST /upload-audio

Upload meeting audio and receive structured notes.

**Request:** `multipart/form-data`
- `file` — audio file (WAV, M4A, OGG, WEBM, MP3, AAC, FLAC)
- `duration_seconds` — recording duration in seconds

**Response:**
```json
{
  "id": 1,
  "title": "Meeting — Mar 24, 2026 11:30 AM",
  "summary": "Discussion about dashboard improvements...",
  "key_points": ["dashboard performance issues identified", "deployment planned next week"],
  "action_items": ["Usha: benchmark dashboard performance"],
  "transcript": "Speaker A:\nWe should improve dashboard performance.\n\nSpeaker B:\n..."
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ASSEMBLYAI_API_KEY` | Yes | AssemblyAI API key for transcription + diarization |
| `ANTHROPIC_API_KEY` | No | Anthropic API key for Claude summarization (coming soon) |

## Deployment

### Backend (Railway)

The backend is deployed on Railway:
- Install Railway CLI: `npm install -g @railway/cli`
- Login: `railway login`
- Deploy: `cd backend && railway up`
- Set env vars in Railway dashboard: `ASSEMBLYAI_API_KEY`
- Generate domain: `railway domain`

### Mobile App

Update the production API URL in `mobile-app/src/environments/environment.prod.ts` with your Railway URL, then build the APK following the steps above.

## Project Structure

```
Meeting Recorder/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, exception handler
│   │   ├── config.py               # Environment settings
│   │   ├── routes/
│   │   │   ├── audio.py            # POST /upload-audio, GET /recordings/:id
│   │   │   └── meetings.py         # CRUD for meetings
│   │   ├── services/
│   │   │   ├── transcription.py    # AssemblyAI integration
│   │   │   ├── summary.py          # Claude API integration
│   │   │   └── database.py         # SQLite operations
│   │   └── models/
│   │       └── meeting.py          # Pydantic models
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── mobile-app/
│   ├── src/app/
│   │   ├── pages/
│   │   │   ├── recording/          # Home screen — start/stop recording
│   │   │   ├── processing/         # Processing animation screen
│   │   │   ├── results/            # Meeting notes display
│   │   │   ├── meetings/           # Meeting history list
│   │   │   └── settings/           # App settings
│   │   ├── services/
│   │   │   ├── recording.service   # Mic recording + timer
│   │   │   ├── api.service         # Backend HTTP calls
│   │   │   └── meeting-state       # Shared state between pages
│   │   └── tabs/                   # Bottom tab navigation
│   ├── capacitor.config.ts
│   └── package.json
└── README.md
```

## License

MIT
