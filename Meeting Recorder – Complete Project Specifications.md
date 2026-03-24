# AI Meeting Recorder – Complete Project Specification

## Project Overview

Build a **mobile application** that records **in-person office meetings** and automatically generates structured meeting notes using AI.

The app should allow a user to place their phone in the middle of a meeting room, record the conversation, and receive:

* Speaker-separated transcript
* Meeting summary
* Key discussion points
* Action items

The goal is to eliminate manual note-taking during meetings.

---

# Target Users

Internal office teams:

* product managers
* developers
* founders
* managers
* designers
* analysts

Meeting types:

* sprint planning
* product demos
* design discussions
* requirement meetings
* decision meetings
* brainstorming sessions

Environment:

* small meeting rooms
* 2–8 participants
* single phone placed on table

---

# Core User Flow

1. User opens the mobile app
2. User taps **Start Meeting**
3. Phone records meeting audio
4. User taps **Stop Meeting**
5. Audio uploads automatically to backend
6. Backend processes audio using AI
7. App displays structured meeting notes

---

# Full Feature List (Product Vision)

### Recording Features

* start meeting recording
* stop meeting recording
* high quality audio capture
* background recording support
* recording timer display
* recording indicator (red dot)
* audio stored locally before upload

---

### AI Processing Features

* speech to text transcription
* speaker diarization (detect speaker changes)
* structured meeting summary
* key discussion points extraction
* action items extraction
* structured transcript generation

---

### Meeting Notes Output

* short meeting summary
* bullet list key points
* bullet list action items
* speaker separated transcript

---

### Data Handling

* upload audio to backend
* process audio using AI services
* return structured JSON response
* optional deletion of audio after processing

---

# MVP Features (Strict Scope)

## Mobile App

### Recording Screen

UI Elements:

Title: Meeting Recorder

Start Meeting button
Stop Meeting button

Recording timer

Recording indicator (red dot)

---

### Recording Behavior

* record audio using phone microphone
* record in high quality WAV format
* recording continues if app minimized
* recording continues if screen locked (if supported)
* audio stored locally before upload
* audio uploaded automatically when recording stops

---

### Processing Screen

After recording stops:

Display message:

Processing meeting…

Processing may take 30–120 seconds depending on meeting length.

---

### Result Screen

Display:

Meeting Summary

Key Discussion Points

Action Items

Transcript (collapsible section)

---

### No Authentication

No login required for MVP.

---

# Output Format

Example output:

Summary

Discussion about dashboard performance improvements and deployment timeline.

Key Discussion Points

* dashboard performance issues identified
* deployment planned next week
* analytics feature suggested

Action Items

* Usha: benchmark dashboard performance
* Ravi: prepare deployment checklist

Transcript

Speaker 1:
We should improve dashboard performance.

Speaker 2:
Yes especially mobile performance.

Speaker 1:
We should deploy next week.

---

# Technical Architecture

Mobile app records audio and uploads to backend API.

Backend processes audio using AI pipeline and returns structured notes.

---

# Tech Stack

## Mobile Application

Framework:

Ionic Angular with Capacitor

Reasons:

fast development
reuses Angular knowledge
easy microphone access
works on Android and iOS
AI agents can generate code easily

---

Plugins:

capacitor voice recording plugin
capacitor http plugin

---

Audio format:

WAV

16kHz or 44.1kHz

mono channel

Reason:

better transcription accuracy

---

## Backend

Language:

Python

Framework:

FastAPI

Reasons:

simple API development
strong ecosystem for AI libraries
easy deployment
fast processing

---

## AI Services

Speech-to-text:

OpenAI Whisper API

Converts meeting audio into text transcript.

---

Speaker diarization:

pyannote.audio

Detects speaker changes.

Example output:

Speaker 1
Speaker 2
Speaker 3

MVP does not include speaker name recognition.

---

Meeting summarization:

Claude API

Generates structured meeting notes.

---

## Hosting

Backend hosting:

Railway or Render

Reason:

simple deployment
minimal configuration
suitable for MVP

---

# System Architecture

Mobile App
records audio
uploads audio file

↓

FastAPI backend

↓

Whisper API
speech to text

↓

pyannote diarization
speaker detection

↓

Claude API
summary generation

↓

structured JSON response

↓

mobile app displays result

---

# Backend API Specification

Endpoint:

POST /upload-audio

Request:

multipart form data

file:

audio.wav

---

Response JSON format:

{
summary: string,
key_points: string[],
action_items: string[],
transcript: string
}

---

# AI Processing Pipeline

Step 1

Receive audio file from mobile app.

---

Step 2

Send audio file to Whisper API.

Receive transcript text.

---

Step 3

Run pyannote diarization on audio.

Detect speaker timestamps.

Example:

00:00–00:10 Speaker 1
00:10–00:25 Speaker 2

---

Step 4

Combine transcript with speaker segments.

Generate formatted transcript:

Speaker 1:
text

Speaker 2:
text

---

Step 5

Send transcript to Claude API.

Claude generates:

summary
key discussion points
action items

---

Step 6

Return structured JSON response to mobile app.

---

# Claude Prompt for Summary

Prompt template:

You are an AI meeting assistant.

Analyze the transcript and generate structured meeting notes.

Return:

1. Summary
2. Key discussion points
3. Action items

Transcript:

[TRANSCRIPT]

Return output in JSON format.

---

# Mobile App Screens

## Screen 1

Meeting Recorder

Button:

Start Meeting

During recording:

show timer
show red recording indicator

Button changes to Stop Meeting

---

## Screen 2

Processing Screen

Display:

Processing meeting…

---

## Screen 3

Meeting Notes Screen

Sections:

Summary

Key Points

Action Items

Transcript (collapsible)

---

# File Handling

Temporary audio stored locally before upload.

File naming format:

meeting-YYYY-MM-DD-HH-MM-SS.wav

---

# Performance Expectations

30 minute meeting:

processing time approximately 30–90 seconds.

---

# Security Considerations

MVP scope:

no authentication required.

audio files may be deleted after processing.

no permanent storage required initially.

---

# Required API Keys

OPENAI_API_KEY

used for Whisper transcription.

---

ANTHROPIC_API_KEY

used for Claude summarization.

---

HUGGINGFACE_TOKEN

used for pyannote diarization model download.

---

# Environment Variables

OPENAI_API_KEY

ANTHROPIC_API_KEY

HUGGINGFACE_TOKEN

---

# Suggested Folder Structure

mobile-app

ionic project

components

recording service

API service

---

backend

FastAPI app

routes

services

transcription service

diarization service

summary service

---

# Deliverables Expected From Coding Agent

complete mobile app code

complete backend code

API integration working end-to-end

requirements.txt

package.json

instructions to run backend locally

instructions to run mobile app locally

sample test audio support

---

# Explicit NON-MVP Features

do not implement these yet:

user login

meeting history

speaker voice recognition

cloud storage

real-time transcription

PDF export

sharing meeting notes

team collaboration

calendar integration

multi-device recording

search across meetings

editing transcript

analytics dashboard

---

# Future Features (Post-MVP)

speaker name recognition

meeting history list

search across meetings

export notes to PDF

share meeting summary

highlight decisions

real-time transcription

multiple devices recording same meeting

calendar integration

email summary after meeting

knowledge base search

team workspace

---

# Success Criteria

User can record a real office meeting.

After recording stops:

app shows transcript

app shows useful summary

app shows clear action items

user no longer needs to take manual notes.
