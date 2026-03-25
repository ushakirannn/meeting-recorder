import { Component, OnDestroy } from '@angular/core';
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
export class ProcessingPage implements ViewDidEnter, OnDestroy {
  currentStep = 0;
  elapsedTime = 0;
  statusTitle = 'Uploading audio...';
  statusMessage = 'Sending recording to server.';
  statusIcon = 'cloud_upload';

  private timer: any;
  private retryCount = 0;
  private maxRetries = 2;

  constructor(
    private apiService: ApiService,
    private meetingState: MeetingStateService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  ionViewDidEnter(): void {
    this.retryCount = 0;
    this.startProcessing();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private startProcessing(): void {
    this.currentStep = 1;
    this.elapsedTime = 0;
    this.statusTitle = 'Uploading audio...';
    this.statusMessage = 'Sending recording to server.';
    this.statusIcon = 'cloud_upload';

    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.elapsedTime++;
      if (this.elapsedTime >= 3 && this.currentStep === 1) {
        this.currentStep = 2;
        this.statusTitle = 'Transcribing audio...';
        this.statusMessage = 'AI is converting speech to text and identifying speakers.';
        this.statusIcon = 'mic';
      }
      if (this.elapsedTime >= 15 && this.currentStep === 2) {
        this.currentStep = 3;
        this.statusTitle = 'Analyzing content...';
        this.statusMessage = 'Generating summary, key points, and action items.';
        this.statusIcon = 'auto_awesome';
      }
    }, 1000);

    this.processAudio();
  }

  private async processAudio(): Promise<void> {
    const blob = this.meetingState.audioBlob;
    const filename = this.meetingState.audioFilename;

    if (!blob || !filename) {
      this.router.navigate(['/tabs/home']);
      return;
    }

    try {
      const result = await this.apiService.uploadAudio(blob, filename, this.meetingState.durationSeconds);
      result.hasAudio = true;
      this.meetingState.result = result;
      clearInterval(this.timer);
      this.router.navigate(['/results']);
    } catch (error: any) {
      clearInterval(this.timer);

      // Auto-retry for network errors
      if (this.retryCount < this.maxRetries && (error?.status === 0 || error?.status >= 500)) {
        this.retryCount++;
        this.statusTitle = `Retrying... (${this.retryCount}/${this.maxRetries})`;
        this.statusMessage = 'Connection issue detected. Retrying automatically.';
        this.statusIcon = 'refresh';
        setTimeout(() => this.startProcessing(), 3000);
        return;
      }

      let message = 'Failed to process meeting audio.';
      let errorType = 'unknown';
      if (error?.status === 0) {
        message = 'Cannot connect to server. Please check your network connection.';
        errorType = 'network';
      } else if (error?.error?.detail) {
        message = error.error.detail;
        errorType = 'server';
      } else if (error?.name === 'TimeoutError') {
        message = 'Processing took too long. The audio file may be too large.';
        errorType = 'timeout';
      }

      // Save failed meeting locally so audio is never lost
      await this.meetingState.saveFailedMeeting(
        blob, filename, this.meetingState.durationSeconds, message
      );

      const alert = await this.alertCtrl.create({
        header: 'Processing Failed',
        message: message + '\n\nYour recording has been saved locally. You can retry from the Meetings tab.',
        buttons: [
          {
            text: 'Retry Now',
            handler: () => {
              this.retryCount = 0;
              this.startProcessing();
            },
          },
          {
            text: 'Go to Meetings',
            handler: () => this.router.navigate(['/tabs/meetings']),
          },
        ],
      });
      await alert.present();
    }
  }
}
