import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.darkchat.app",
  appName: "DarkChat",
  webDir: "public",
  server: {
    // Troque pela URL do seu deploy na Vercel depois do primeiro deploy.
    url: "https://SEU-APP.vercel.app",
    cleartext: true,
  },
  backgroundColor: "#0a0505",
};

export default config;
