import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mountaineerapps.mosslight",
  appName: "Mosslight",
  webDir: "dist",
  ios: { contentInset: "never", backgroundColor: "#85dfdd" },
};
export default config;
