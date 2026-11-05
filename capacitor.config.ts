import type { CapacitorConfig } from "@capacitor/cli";

// Native shell loads the published unibook site; dist/mobile is only an offline fallback page.
const config: CapacitorConfig = {
  appId: "store.unibook.app",
  appName: "unibook",
  webDir: "dist/mobile",
  server: {
    url: "https://unibook.store/?app=1",
    cleartext: false,
    allowNavigation: ["unibook.store", "*.unibook.store", "*.supabase.co", "accounts.google.com"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#faf6ef",
      showSpinner: true,
      spinnerColor: "#9a4320",
      splashFullScreen: true,
    },
    StatusBar: { style: "LIGHT", backgroundColor: "#faf6ef", overlaysWebView: false },
  },
};

export default config;
