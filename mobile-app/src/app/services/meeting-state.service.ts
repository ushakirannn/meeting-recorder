import { Injectable } from '@angular/core';
import { MeetingResult } from './api.service';

export interface FailedMeeting {
  id: string;
  filename: string;
  durationSeconds: number;
  recordedAt: string;
  errorMessage: string;
  audioBase64: string;
  mimeType: string;
}

@Injectable({ providedIn: 'root' })
export class MeetingStateService {
  audioBlob: Blob | null = null;
  audioFilename = '';
  durationSeconds = 0;
  result: MeetingResult | null = null;

  clear(): void {
    this.audioBlob = null;
    this.audioFilename = '';
    this.durationSeconds = 0;
    this.result = null;
  }

  // --- Failed meetings persistence ---

  async saveFailedMeeting(blob: Blob, filename: string, durationSeconds: number, errorMessage: string): Promise<void> {
    const base64 = await this.blobToBase64(blob);
    const failed: FailedMeeting = {
      id: Date.now().toString(),
      filename,
      durationSeconds,
      recordedAt: new Date().toISOString(),
      errorMessage,
      audioBase64: base64,
      mimeType: blob.type || 'audio/mp4',
    };

    const existing = this.getFailedMeetings();
    existing.push(failed);
    localStorage.setItem('failed_meetings', JSON.stringify(existing));
  }

  getFailedMeetings(): FailedMeeting[] {
    try {
      return JSON.parse(localStorage.getItem('failed_meetings') || '[]');
    } catch {
      return [];
    }
  }

  removeFailedMeeting(id: string): void {
    const meetings = this.getFailedMeetings().filter(m => m.id !== id);
    localStorage.setItem('failed_meetings', JSON.stringify(meetings));
  }

  failedMeetingToBlob(meeting: FailedMeeting): Blob {
    const byteCharacters = atob(meeting.audioBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: meeting.mimeType });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g. "data:audio/mp4;base64,")
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
