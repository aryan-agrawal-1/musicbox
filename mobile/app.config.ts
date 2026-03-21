import type { ExpoConfig } from "expo/config";

const baseConfig = require("./app.json").expo as ExpoConfig;

const appVariant = process.env.EXPO_PUBLIC_APP_VARIANT ?? "production";
const isDevVariant = appVariant === "development";

const iosBundleId = isDevVariant
  ? "com.aryan.muze.dev"
  : "com.aryan.muze";
const androidPackage = isDevVariant
  ? "com.aryan.muze.dev"
  : "com.aryan.muze";

export default (): ExpoConfig => ({
  ...baseConfig,
  name: isDevVariant ? "Noted Dev" : "Noted",
  // Explicit runtime + updates so EAS / expo-updates never see a half-resolved config.
  runtimeVersion: baseConfig.runtimeVersion ?? { policy: "appVersion" },
  updates: {
    ...baseConfig.updates,
    // Dev client: avoid pulling OTA bundles; use Metro via `expo start --dev-client`.
    ...(isDevVariant ? { enabled: false } : {})
  },
  ios: {
    ...baseConfig.ios,
    bundleIdentifier: iosBundleId
  },
  android: {
    ...baseConfig.android,
    package: androidPackage
  },
  extra: {
    ...baseConfig.extra,
    appVariant
  }
});
