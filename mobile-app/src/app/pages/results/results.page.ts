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
  tags: string[] = [];
  speakers: string[] = [];
  speakerMap: Record<string, string> = {};

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
    this.tags = this.result.tags || [];
    this.speakerMap = this.result.speaker_map || {};
    this.extractSpeakers();
  }

  private extractSpeakers(): void {
    if (!this.result?.transcript) return;
    const matches = this.result.transcript.match(/Speaker [A-Z]:/g);
    if (matches) {
      this.speakers = [...new Set(matches.map(m => m.replace(':', '')))];
    }
  }

  getDisplayTranscript(): string {
    if (!this.result?.transcript) return '';
    let text = this.result.transcript;
    for (const [original, renamed] of Object.entries(this.speakerMap)) {
      text = text.replace(new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), renamed);
    }
    return text;
  }

  async renameSpeaker(speaker: string): Promise<void> {
    const currentName = this.speakerMap[speaker] || speaker;
    const alert = await this.alertCtrl.create({
      header: 'Rename Speaker',
      message: `Rename "${currentName}" to:`,
      inputs: [{ name: 'name', type: 'text', value: currentName === speaker ? '' : currentName, placeholder: 'e.g. Usha, Ravi' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            const name = data.name?.trim();
            if (name) {
              this.speakerMap[speaker] = name;
            } else {
              delete this.speakerMap[speaker];
            }
            if (this.result?.id) {
              try {
                await this.apiService.updateSpeakerMap(this.result.id, this.speakerMap);
              } catch (e) { /* silent */ }
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async addTag(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Add Tag',
      inputs: [{ name: 'tag', type: 'text', placeholder: 'e.g. sprint-planning, design-review' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: async (data) => {
            const tag = data.tag?.trim().toLowerCase();
            if (tag && !this.tags.includes(tag)) {
              this.tags.push(tag);
              if (this.result?.id) {
                try {
                  await this.apiService.updateTags(this.result.id, this.tags);
                } catch (e) { /* silent */ }
              }
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async removeTag(tag: string): Promise<void> {
    this.tags = this.tags.filter(t => t !== tag);
    if (this.result?.id) {
      try {
        await this.apiService.updateTags(this.result.id, this.tags);
      } catch (e) { /* silent */ }
    }
  }

  async renameMeeting(): Promise<void> {
    if (!this.result?.id) return;
    const alert = await this.alertCtrl.create({
      header: 'Name this meeting',
      inputs: [{ name: 'title', type: 'text', value: this.result.title || '', placeholder: 'e.g. Sprint Planning, Design Review' }],
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
              } catch (e) { /* silent */ }
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async shareMeeting(): Promise<void> {
    if (!this.result) return;

    const title = this.result.title || 'Meeting Notes';
    const lines = [
      `📋 ${title}`,
      '',
      '📝 Summary',
      this.result.summary,
      '',
      '💡 Key Discussion Points',
      ...this.result.key_points.map(p => `• ${p}`),
    ];

    if (this.result.action_items?.length) {
      lines.push('', '✅ Action Items');
      lines.push(...this.result.action_items.map(a => `• ${a}`));
    }

    lines.push('', '🎙️ Transcript', this.getDisplayTranscript());

    const text = lines.join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title, text });
      } catch (e) {
        // User cancelled or share failed — fallback to clipboard
        this.copyToClipboard(text);
      }
    } else {
      this.copyToClipboard(text);
    }
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      const alert = await this.alertCtrl.create({
        header: 'Copied!',
        message: 'Meeting notes copied to clipboard.',
        buttons: ['OK'],
      });
      await alert.present();
    } catch (e) {
      // Last resort — show text in a dialog
      const alert = await this.alertCtrl.create({
        header: 'Share Notes',
        message: text,
        buttons: ['Close'],
      });
      await alert.present();
    }
  }

  newMeeting(): void {
    this.meetingState.clear();
    this.router.navigate(['/tabs/home']);
  }
}
