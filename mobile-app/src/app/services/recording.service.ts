import { Injectable } from '@angular/core';
import { VoiceRecorder, RecordingData } from 'capacitor-voice-recorder';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

@Injectable({ providedIn: 'root' })
export class RecordingService {
  isRecording = false;
  elapsedSeconds = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  async startRecording(): Promise<void> {
    const permission = await VoiceRecorder.requestAudioRecordingPermission();
    if (!permission.value) {
      throw new Error('Microphone permission denied. Please enable microphone access in your device settings.');
    }

    // Check if another recording is in progress
    const status = await VoiceRecorder.getCurrentStatus();
    if (status.status === 'RECORDING') {
      await VoiceRecorder.stopRecording();
    }

    await VoiceRecorder.startRecording();
    this.isRecording = true;
    this.elapsedSeconds = 0;

    this.timerInterval = setInterval(() => {
      this.elapsedSeconds++;
    }, 1000);

    // Keep screen awake during recording (prevents device sleep)
    try {
      await KeepAwake.keepAwake();
    } catch (e) {
      // Non-critical — recording still works without it
    }
  }

  async stopRecording(): Promise<RecordingData> {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRecording = false;

    // Release wake lock
    try {
      await KeepAwake.allowSleep();
    } catch (e) {
      // Non-critical
    }

    // Minimum recording duration check
    if (this.elapsedSeconds < 2) {
      throw new Error('Recording too short. Please record at least a few seconds of audio.');
    }

    const result = await VoiceRecorder.stopRecording();
    return result;
  }

  formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
