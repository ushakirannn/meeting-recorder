import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpEventType, HttpEvent } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom, timeout, Observable, Subject, lastValueFrom, filter, map, tap } from 'rxjs';

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

  uploadProgress$ = new Subject<number>();

  async uploadAudio(audioBlob: Blob, filename: string, durationSeconds: number = 0): Promise<MeetingResult> {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    formData.append('duration_seconds', durationSeconds.toString());

    // Dynamic timeout: 1 min per 10 MB, min 5 min, max 30 min
    const sizeMB = audioBlob.size / (1024 * 1024);
    const timeoutMs = Math.min(1800000, Math.max(300000, sizeMB * 6000));

    return new Promise<MeetingResult>((resolve, reject) => {
      this.http.post(`${this.apiUrl}/upload-audio`, formData, {
        reportProgress: true,
        observe: 'events',
      }).pipe(timeout(timeoutMs)).subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const pct = Math.round((event.loaded / event.total) * 100);
            this.uploadProgress$.next(pct);
          } else if (event.type === HttpEventType.Response) {
            this.uploadProgress$.next(100);
            resolve(event.body as MeetingResult);
          }
        },
        error: (err) => reject(err),
      });
    });
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
