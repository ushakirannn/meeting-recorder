import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ViewDidEnter } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { MeetingStateService } from '../../services/meeting-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-processing',
  templateUrl: './processing.page.html',
  styleUrls: ['./processing.page.scss'],
  standalone: false,
})
export class ProcessingPage implements ViewDidEnter, OnDestroy {
  currentStep = 0;
  elapsedTime = 0;
  uploadProgress = 0;
  fileSizeMB = 0;
  statusTitle = 'Uploading audio...';
  statusMessage = 'Sending recording to server.';
  statusIcon = 'cloud_upload';
  longMeetingMessage = '';

  private timer: any;
  private retryCount = 0;
  private maxRetries = 2;
  private progressSub?: Subscription;

  constructor(
    private apiService: ApiService,
    private meetingState: MeetingStateService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  ionViewDidEnter(): void {
    this.retryCount = 0;
    this.fileSizeMB = (this.meetingState.audioBlob?.size || 0) / (1024 * 1024);
    this.startProcessing();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    this.progressSub?.unsubscribe();
  }

  private startProcessing(): void {
    this.currentStep = 1;
    this.elapsedTime = 0;
    this.uploadProgress = 0;
    this.longMeetingMessage = '';
    this.statusTitle = 'Uploading audio...';
    this.statusMessage = this.fileSizeMB > 10
      ? `Sending ${this.fileSizeMB.toFixed(0)} MB to server.`
      : 'Sending recording to server.';
    this.statusIcon = 'cloud_upload';

    // Adaptive thresholds based on file size
    const step2At = 5;
    const step3At = Math.max(30, this.fileSizeMB * 2);

    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.elapsedTime++;

      if (this.elapsedTime >= step2At && this.currentStep === 1 && this.uploadProgress >= 100) {
        this.currentStep = 2;
        this.statusTitle = 'Transcribing audio...';
        this.statusMessage = 'AI is converting speech to text and identifying speakers.';
        this.statusIcon = 'mic';
      }
      if (this.elapsedTime >= step3At && this.currentStep === 2) {
        this.currentStep = 3;
        this.statusTitle = 'Analyzing content...';
        this.statusMessage = 'Generating summary, key points, and action items.';
        this.statusIcon = 'auto_awesome';
      }

      // Long meeting messages
      if (this.elapsedTime === 120) {
        this.longMeetingMessage = 'Long meetings take extra time to process. Your recording is safe.';
      }
      if (this.elapsedTime === 600) {
        this.longMeetingMessage = 'Still processing. This is normal for meetings over 30 minutes.';
      }
    }, 1000);

    // Subscribe to upload progress
    this.progressSub?.unsubscribe();
    this.progressSub = this.apiService.uploadProgress$.subscribe(pct => {
      this.uploadProgress = pct;
      if (pct < 100) {
        this.statusTitle = `Uploading... ${pct}%`;
        const uploadedMB = (this.fileSizeMB * pct / 100).toFixed(1);
        this.statusMessage = `${uploadedMB} / ${this.fileSizeMB.toFixed(1)} MB`;
      }
    });

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
      this.progressSub?.unsubscribe();
      this.router.navigate(['/results']);
    } catch (error: any) {
      clearInterval(this.timer);
      this.progressSub?.unsubscribe();

      // Auto-retry for network/server errors
      if (this.retryCount < this.maxRetries && (error?.status === 0 || error?.status >= 500)) {
        this.retryCount++;
        this.statusTitle = `Retrying... (${this.retryCount}/${this.maxRetries})`;
        this.statusMessage = 'Connection issue detected. Retrying automatically.';
        this.statusIcon = 'refresh';
        setTimeout(() => this.startProcessing(), 3000);
        return;
      }

      let message = 'Failed to process meeting audio.';
      if (error?.status === 0) {
        message = 'Cannot connect to server. Please check your network connection.';
      } else if (error?.error?.detail) {
        message = error.error.detail;
      } else if (error?.name === 'TimeoutError') {
        message = 'Processing took too long. The audio file may be too large.';
      }

      // Save failed meeting to IndexedDB (never lose the recording)
      await this.meetingState.saveFailedMeeting(
        blob, filename, this.meetingState.durationSeconds, message
      );

      const alert = await this.alertCtrl.create({
        header: 'Processing Failed',
        message: message + '\n\nYour recording has been saved. You can retry from the Meetings tab.',
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
