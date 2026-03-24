import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { MeetingStateService } from '../../services/meeting-state.service';
import { ApiService, MeetingResult } from '../../services/api.service';

@Component({
  selector: 'app-results',
  templateUrl: './results.page.html',
  styleUrls: ['./results.page.scss'],
  standalone: false,
})
export class ResultsPage implements OnInit {
  result: MeetingResult | null = null;
  transcriptOpen = false;
  audioUrl: string | null = null;

  constructor(
    private meetingState: MeetingStateService,
    private apiService: ApiService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  ngOnInit(): void {
    this.result = this.meetingState.result;
    if (!this.result) {
      this.router.navigate(['/tabs/meetings']);
      return;
    }
    if (this.result.id && this.result.hasAudio) {
      this.audioUrl = this.apiService.getRecordingUrl(this.result.id);
    }
  }

  async renameMeeting(): Promise<void> {
    if (!this.result?.id) return;

    const alert = await this.alertCtrl.create({
      header: 'Name this meeting',
      inputs: [
        {
          name: 'title',
          type: 'text',
          value: this.result.title || '',
          placeholder: 'e.g. Sprint Planning, Design Review',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            const newTitle = data.title?.trim();
            if (newTitle && this.result) {
              try {
                await this.apiService.renameMeeting(this.result.id!, newTitle);
                this.result.title = newTitle;
              } catch (e) {
                // silent fail
              }
            }
          },
        },
      ],
    });
    await alert.present();
  }

  newMeeting(): void {
    this.meetingState.clear();
    this.router.navigate(['/tabs/home']);
  }
}
