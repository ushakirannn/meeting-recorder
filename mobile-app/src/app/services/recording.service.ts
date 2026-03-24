import { Injectable } from '@angular/core';
import { VoiceRecorder, RecordingData } from 'capacitor-voice-recorder';

@Injectable({ providedIn: 'root' })
export class RecordingService {
  isRecording = false;
  elapsedSeconds = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  async startRecording(): Promise<void> {
    const permission = await VoiceRecorder.requestAudioRecordingPermission();
    if (!permission.value) {
      throw new Error('Microphone permission denied');
    }

    await VoiceRecorder.startRecording();
    this.isRecording = true;
    this.elapsedSeconds = 0;

    this.timerInterval = setInterval(() => {
      this.elapsedSeconds++;
    }, 1000);
  }

  async stopRecording(): Promise<RecordingData> {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRecording = false;

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
