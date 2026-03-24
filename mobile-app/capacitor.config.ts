import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meetingrecorder.app',
  appName: 'Meeting Recorder',
  webDir: 'www',
  server: {
    cleartext: true
  }
};

export default config;
