import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vinay.poultryledger',
  appName: 'PoultryLedger',
  webDir: 'dist',
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false
    }
  }
};

export default config;
