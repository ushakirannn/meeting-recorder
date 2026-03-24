import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ViewWillEnter } from '@ionic/angular';
import { ApiService, MeetingRecord } from '../../services/api.service';
import { MeetingStateService } from '../../services/meeting-state.service';

@Component({
  selector: 'app-meetings',
  templateUrl: './meetings.page.html',
  styleUrls: ['./meetings.page.scss'],
  standalone: false,
})
export class MeetingsPage implements ViewWillEnter {
  meetings: MeetingRecord[] = [];
  loading = true;
  error = '';

  constructor(
    private apiService: ApiService,
    private meetingState: MeetingStateService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  ionViewWillEnter(): void {
    this.loadMeetings();
  }

  async loadMeetings(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.meetings = await this.apiService.getMeetings();
    } catch (e) {
      this.error = 'Could not load meetings.';
    } finally {
      this.loading = false;
    }
  }

  viewMeeting(meeting: MeetingRecord): void {
    this.meetingState.result = {
      id: meeting.id,
      title: meeting.title,
      summary: meeting.summary,
      key_points: meeting.key_points,
      action_items: meeting.action_items,
      transcript: meeting.transcript,
      hasAudio: !!meeting.audio_filename,
    };
    this.router.navigate(['/results']);
  }

  async renameMeeting(meeting: MeetingRecord, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Rename Meeting',
      inputs: [
        {
          name: 'title',
          type: 'text',
          value: meeting.title,
          placeholder: 'Meeting name',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            const newTitle = data.title?.trim();
            if (newTitle && newTitle !== meeting.title) {
              try {
                await this.apiService.renameMeeting(meeting.id, newTitle);
                meeting.title = newTitle;
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

  async confirmDelete(meeting: MeetingRecord, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Meeting',
      message: `Delete "${meeting.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.deleteMeeting(meeting.id),
        },
      ],
    });
    await alert.present();
  }

  async deleteMeeting(id: number): Promise<void> {
    try {
      await this.apiService.deleteMeeting(id);
      this.meetings = this.meetings.filter(m => m.id !== id);
    } catch (e) {
      // silent fail
    }
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'Z');
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }
}
