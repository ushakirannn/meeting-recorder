import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ViewWillEnter } from '@ionic/angular';
import { ApiService, MeetingRecord } from '../../services/api.service';
import { MeetingStateService, FailedMeeting } from '../../services/meeting-state.service';

@Component({
  selector: 'app-meetings',
  templateUrl: './meetings.page.html',
  styleUrls: ['./meetings.page.scss'],
  standalone: false,
})
export class MeetingsPage implements ViewWillEnter {
  meetings: MeetingRecord[] = [];
  failedMeetings: FailedMeeting[] = [];
  loading = true;
  error = '';

  searchQuery = '';
  dateFrom = '';
  dateTo = '';
  filterTag = '';
  showFilters = false;
  allTags: string[] = [];
  retryingId: string | null = null;

  private searchTimeout: any;

  constructor(
    private apiService: ApiService,
    private meetingState: MeetingStateService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  async ionViewWillEnter(): Promise<void> {
    this.loadMeetings();
    this.failedMeetings = await this.meetingState.getFailedMeetings();
  }

  get hasActiveFilters(): boolean {
    return !!(this.dateFrom || this.dateTo || this.filterTag);
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadMeetings(), 300);
  }

  clearFilters(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.filterTag = '';
    this.searchQuery = '';
    this.loadMeetings();
  }

  async loadMeetings(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.meetings = await this.apiService.getMeetings({
        search: this.searchQuery || undefined,
        date_from: this.dateFrom || undefined,
        date_to: this.dateTo || undefined,
        tag: this.filterTag || undefined,
      });
      const tagSet = new Set<string>();
      this.meetings.forEach(m => m.tags?.forEach(t => tagSet.add(t)));
      this.allTags = Array.from(tagSet).sort();
    } catch (e) {
      this.error = 'Could not load meetings.';
    } finally {
      this.loading = false;
    }
  }

  // --- Failed meeting retry ---

  async retryFailedMeeting(failed: FailedMeeting): Promise<void> {
    this.retryingId = failed.id;
    try {
      const blob = await this.meetingState.getFailedMeetingBlob(failed.id);
      if (!blob) throw new Error('Recording not found in local storage.');

      const result = await this.apiService.uploadAudio(blob, failed.filename, failed.durationSeconds);

      // Success — remove from failed list and reload
      await this.meetingState.removeFailedMeeting(failed.id);
      this.failedMeetings = await this.meetingState.getFailedMeetings();
      await this.loadMeetings();

      const alert = await this.alertCtrl.create({
        header: 'Success',
        message: 'Meeting processed successfully!',
        buttons: [{
          text: 'View',
          handler: () => {
            result.hasAudio = true;
            this.meetingState.result = result;
            this.router.navigate(['/results']);
          }
        }, { text: 'OK' }],
      });
      await alert.present();
    } catch (e: any) {
      const alert = await this.alertCtrl.create({
        header: 'Retry Failed',
        message: e?.error?.detail || 'Still unable to process. Your recording is safely saved locally.',
        buttons: ['OK'],
      });
      await alert.present();
    } finally {
      this.retryingId = null;
    }
  }

  async deleteFailedMeeting(failed: FailedMeeting, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Failed Recording',
      message: 'This will permanently delete the saved recording. Are you sure?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.meetingState.removeFailedMeeting(failed.id);
            this.failedMeetings = await this.meetingState.getFailedMeetings();
          },
        },
      ],
    });
    await alert.present();
  }

  // --- Regular meetings ---

  viewMeeting(meeting: MeetingRecord): void {
    this.meetingState.result = {
      id: meeting.id,
      title: meeting.title,
      summary: meeting.summary,
      key_points: meeting.key_points,
      action_items: meeting.action_items,
      transcript: meeting.transcript,
      hasAudio: !!meeting.audio_filename,
      tags: meeting.tags,
      speaker_map: meeting.speaker_map,
    };
    this.router.navigate(['/results']);
  }

  async renameMeeting(meeting: MeetingRecord, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Rename Meeting',
      inputs: [{ name: 'title', type: 'text', value: meeting.title, placeholder: 'Meeting name' }],
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
              } catch (e) { /* silent */ }
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
    } catch (e) { /* silent */ }
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

  formatDateSimple(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }
}
