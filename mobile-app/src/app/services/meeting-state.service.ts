import { Injectable } from '@angular/core';
import { MeetingResult } from './api.service';

export interface FailedMeeting {
  id: string;
  filename: string;
  durationSeconds: number;
  recordedAt: string;
  errorMessage: string;
  mimeType: string;
  fileSize: number;
}

const DB_NAME = 'meeting_recorder_db';
const STORE_META = 'failed_meetings_meta';
const STORE_BLOBS = 'failed_meetings_blobs';
const DB_VERSION = 1;

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

  // --- IndexedDB for failed meetings ---

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          db.createObjectStore(STORE_BLOBS);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveFailedMeeting(blob: Blob, filename: string, durationSeconds: number, errorMessage: string): Promise<void> {
    const id = Date.now().toString();
    const meta: FailedMeeting = {
      id,
      filename,
      durationSeconds,
      recordedAt: new Date().toISOString(),
      errorMessage,
      mimeType: blob.type || 'audio/mp4',
      fileSize: blob.size,
    };

    try {
      const db = await this.openDB();
      const tx = db.transaction([STORE_META, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_META).put(meta);
      tx.objectStore(STORE_BLOBS).put(blob, id);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) {
      console.error('Failed to save to IndexedDB:', e);
    }
  }

  async getFailedMeetings(): Promise<FailedMeeting[]> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const request = store.getAll();
      const result = await new Promise<FailedMeeting[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return result.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    } catch (e) {
      console.error('Failed to read IndexedDB:', e);
      return [];
    }
  }

  async getFailedMeetingBlob(id: string): Promise<Blob | null> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const request = tx.objectStore(STORE_BLOBS).get(id);
      const result = await new Promise<Blob | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return result;
    } catch (e) {
      console.error('Failed to get blob from IndexedDB:', e);
      return null;
    }
  }

  async removeFailedMeeting(id: string): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction([STORE_META, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_META).delete(id);
      tx.objectStore(STORE_BLOBS).delete(id);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) {
      console.error('Failed to remove from IndexedDB:', e);
    }
  }
}
