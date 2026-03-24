import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom, timeout } from 'rxjs';

export interface MeetingResult {
  id?: number;
  title?: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  transcript: string;
  hasAudio?: boolean;
}

export interface MeetingRecord {
  id: number;
  title: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  transcript: string;
  duration_seconds: number;
  audio_filename: string | null;
  created_at: string;
}



@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  async uploadAudio(audioBlob: Blob, filename: string, durationSeconds: number = 0): Promise<MeetingResult> {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    formData.append('duration_seconds', durationSeconds.toString());

    return firstValueFrom(
      this.http
        .post<MeetingResult>(`${this.apiUrl}/upload-audio`, formData)
        .pipe(timeout(300000))
    );
  }

  async getMeetings(): Promise<MeetingRecord[]> {
    return firstValueFrom(
      this.http.get<MeetingRecord[]>(`${this.apiUrl}/meetings`)
    );
  }

  async getMeeting(id: number): Promise<MeetingRecord> {
    return firstValueFrom(
      this.http.get<MeetingRecord>(`${this.apiUrl}/meetings/${id}`)
    );
  }

  async renameMeeting(id: number, title: string): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${this.apiUrl}/meetings/${id}`, { title })
    );
  }

  getRecordingUrl(meetingId: number): string {
    return `${this.apiUrl}/recordings/${meetingId}`;
  }

  async deleteMeeting(id: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.apiUrl}/meetings/${id}`)
    );
  }
}
