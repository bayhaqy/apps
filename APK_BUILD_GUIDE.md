# APK Build Guide (for site owner)

This file is documentation only — it is NOT a real Android APK. It explains how to wrap
the static `/apps/` site into a real offline .apk using Capacitor.

## Prerequisites
- Node.js 18+
- Android Studio (with Android SDK 33+)
- Java JDK 17

## Steps

```bash
# 1. Create a Capacitor project
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Apps by Bayhaqy" "id.bayhaqy.apps" --web-dir=apps

# 2. Copy the apps site as the web assets
# (the /apps/ folder from this repo becomes the web root)

# 3. Add Android platform
npx cap add android

# 4. Build the web assets (no build step needed — they're static HTML)
npx cap copy android

# 5. Open in Android Studio and build APK
npx cap open android
# In Android Studio: Build > Build Bundle(s)/APK(s) > Build APK(s)

# 6. Rename output
mv app-release.apk bayhaqy-apps.apk
```

## Hosting the APK
Place `bayhaqy-apps.apk` at `/apps/bayhaqy-apps.apk` (next to this folder's `index.html`).
The download button on the apps landing page links to that path.

## Alternative: PWA (already implemented)
For most users the PWA install (Add to Home Screen) is simpler and works on iOS too.
The manifest.json and service-worker.js in this folder enable that path.

## Security Note
APK sideloading requires users to enable "Install unknown apps" on Android.
The PWA path is recommended for non-technical users.
