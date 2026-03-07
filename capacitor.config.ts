import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0b28801dfc564319b363135e72a077ee',
  appName: 'AgroEye',
  webDir: 'dist',
  // For development, uncomment the server block below to enable live reload:
  // server: {
  //   url: 'https://0b28801d-fc56-4319-b363-135e72a077ee.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#F5F5DC",
      showSpinner: false,
    },
  },
};

export default config;
