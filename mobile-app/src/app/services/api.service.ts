import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  tags?: string[];
  speaker_map?: Record<string, string>;
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
  tags: string[];
  speaker_map: Record<string, string>;
  created_at: string;
}

export interface MeetingFilters {
  search?: string;
  date_from?: string;
  date_to?: string;
  tag?: string;
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

  async getMeetings(filters?: MeetingFilters): Promise<MeetingRecord[]> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.date_from) params = params.set('date_from', filters.date_from);
    if (filters?.date_to) params = params.set('date_to', filters.date_to);
    if (filters?.tag) params = params.set('tag', filters.tag);

    return firstValueFrom(
      this.http.get<MeetingRecord[]>(`${this.apiUrl}/meetings`, { params })
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

  async updateTags(id: number, tags: string[]): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiUrl}/meetings/${id}/tags`, { tags })
    );
  }

  async updateSpeakerMap(id: number, speakerMap: Record<string, string>): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiUrl}/meetings/${id}/speakers`, { speaker_map: speakerMap })
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
