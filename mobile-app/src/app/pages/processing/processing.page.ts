import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ViewDidEnter } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { MeetingStateService } from '../../services/meeting-state.service';

@Component({
  selector: 'app-processing',
  templateUrl: './processing.page.html',
  styleUrls: ['./processing.page.scss'],
  standalone: false,
})
export class ProcessingPage implements ViewDidEnter {

  constructor(
    private apiService: ApiService,
    private meetingState: MeetingStateService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  ionViewDidEnter(): void {
    this.processAudio();
  }

  private async processAudio(): Promise<void> {
    const blob = this.meetingState.audioBlob;
    const filename = this.meetingState.audioFilename;

    console.log('Processing audio:', { blob: !!blob, filename, blobSize: blob?.size });

    if (!blob || !filename) {
      console.warn('No audio blob found, redirecting to recording');
      this.router.navigate(['/tabs/home']);
      return;
    }

    try {
      console.log('Uploading audio to backend...');
      const result = await this.apiService.uploadAudio(blob, filename, this.meetingState.durationSeconds);
      console.log('Upload successful:', result);
      result.hasAudio = true;
      this.meetingState.result = result;
      this.router.navigate(['/results']);
    } catch (error: any) {
      console.error('Upload failed:', error);
      let message = 'Failed to process meeting audio. Please try again.';
      if (error?.status === 0) {
        message = 'Cannot connect to server. Please check your network connection and ensure the backend is running.';
      } else if (error?.error?.detail) {
        message = error.error.detail;
      } else if (error?.name === 'TimeoutError') {
        message = 'Processing took too long. Please try again with a shorter recording.';
      }

      const alert = await this.alertCtrl.create({
        header: 'Processing Error',
        message,
        buttons: [{
          text: 'OK',
          handler: () => {
            this.router.navigate(['/tabs/home']);
          }
        }],
      });
      await alert.present();
    }
  }
}
