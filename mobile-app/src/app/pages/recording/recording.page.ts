import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { RecordingService } from '../../services/recording.service';
import { MeetingStateService } from '../../services/meeting-state.service';

@Component({
  selector: 'app-recording',
  templateUrl: './recording.page.html',
  styleUrls: ['./recording.page.scss'],
  standalone: false,
})
export class RecordingPage {

  constructor(
    public recordingService: RecordingService,
    private meetingState: MeetingStateService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  async startRecording(): Promise<void> {
    try {
      this.meetingState.clear();
      await this.recordingService.startRecording();
    } catch (error: any) {
      const alert = await this.alertCtrl.create({
        header: 'Recording Error',
        message: error.message || 'Could not start recording. Please allow microphone access.',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }

  async stopRecording(): Promise<void> {
    try {
      const result = await this.recordingService.stopRecording();

      // Convert base64 audio to Blob
      const mimeType = result.value.mimeType;
      const base64Data = result.value.recordDataBase64;
      const blob = this.base64ToBlob(base64Data || '', mimeType || 'audio/wav');

      // Generate filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const ext = this.getExtension(mimeType);
      const filename = `meeting-${timestamp}${ext}`;

      // Store in shared state
      this.meetingState.audioBlob = blob;
      this.meetingState.audioFilename = filename;
      this.meetingState.durationSeconds = this.recordingService.elapsedSeconds;

      console.log('Recording stopped:', { mimeType, blobSize: blob.size, filename });

      // Navigate to processing page
      this.router.navigate(['/processing']);
    } catch (error: any) {
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: error.message || 'Could not stop recording.',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'audio/aac': '.m4a',
      'audio/mp4': '.m4a',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav',
      'audio/webm': '.webm',
    };
    return map[mimeType] || '.wav';
  }
}
