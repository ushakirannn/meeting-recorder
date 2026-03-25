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
  isProcessing = false;

  constructor(
    public recordingService: RecordingService,
    private meetingState: MeetingStateService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  async startRecording(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      this.meetingState.clear();
      await this.recordingService.startRecording();
    } catch (error: any) {
      const msg = error.message || 'Could not start recording.';
      const isPermission = msg.toLowerCase().includes('permission');

      const alert = await this.alertCtrl.create({
        header: isPermission ? 'Microphone Access Required' : 'Recording Error',
        message: isPermission
          ? 'Please allow microphone access in your device settings to record meetings.'
          : msg,
        buttons: ['OK'],
      });
      await alert.present();
    } finally {
      this.isProcessing = false;
    }
  }

  async stopRecording(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const result = await this.recordingService.stopRecording();

      const mimeType = result.value.mimeType;
      const base64Data = result.value.recordDataBase64;

      if (!base64Data) {
        throw new Error('No audio data captured. Please try recording again.');
      }

      const blob = this.base64ToBlob(base64Data, mimeType || 'audio/wav');

      // Check if audio is too small (likely empty/corrupt)
      if (blob.size < 1000) {
        throw new Error('Recording appears to be empty. Please try again and speak clearly.');
      }

      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const ext = this.getExtension(mimeType);
      const filename = `meeting-${timestamp}${ext}`;

      this.meetingState.audioBlob = blob;
      this.meetingState.audioFilename = filename;
      this.meetingState.durationSeconds = this.recordingService.elapsedSeconds;

      this.router.navigate(['/processing']);
    } catch (error: any) {
      const alert = await this.alertCtrl.create({
        header: 'Recording Error',
        message: error.message || 'Could not process the recording. Please try again.',
        buttons: ['OK'],
      });
      await alert.present();
    } finally {
      this.isProcessing = false;
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
