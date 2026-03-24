import { Injectable } from '@angular/core';
import { MeetingResult } from './api.service';

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
}
