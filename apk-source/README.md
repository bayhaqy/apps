# Bayhaqy Apps — APK Source (TWA Wrapper)

This folder contains the source for the **Bayhaqy Apps Android APK**. The APK is a thin
**Trusted Web Activity (TWA)** wrapper around the live site at `https://bayhaqy.my.id/apps/` —
it launches fullscreen, loads tools over HTTPS, and stays in sync with the web version.

## Prerequisites

- **Node.js 18+** and **npm**
- **Java 11+** (JDK)
- ~1.5 GB free disk (for the Android SDK, downloaded automatically on first build)

## One-time setup

```bash
# 1. Install Bubblewrap CLI (TWA wrapper tool by Google)
npm install -g @bubblewrap/cli

# 2. Initialize the Android project from the manifest
cd apk-source
bubblewrap init --manifest=twa-manifest.json

# 3. Accept the Android SDK licenses when prompted
#    (Bubblewrap will download the SDK to ~/.android/)
```

## Building the APK

```bash
# Build a release APK (signed with the included keystore)
bubblewrap build

# Output:
#   app-release-signed.apk
```

The signed APK will be in `apk-source/app-release-signed.apk`. Copy it to
`/apps/bayhaqy-apps.apk` in the repo root to make it available for download at
`https://bayhaqy.my.id/apps/bayhaqy-apps.apk`.

## Keystore

The build is signed with a self-signed keystore (`keystore.jks`) generated with:

```bash
keytool -genkeypair \
  -keystore keystore.jks \
  -alias android \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass bayhaqy2026 \
  -keypass bayhaqy2026 \
  -dname "CN=Bayhaqy Apps, OU=IT, O=Achmad Bayhaqy, L=Jakarta, ST=Jakarta, C=ID"
```

**For production:** Generate your own keystore (do NOT reuse this one — the password
is committed to the repo for transparency). Keep the keystore safe — you'll need it
to sign all future updates, and losing it means users must uninstall before updating.

## Digital Asset Links

For the TWA to launch without a browser URL bar, you must host a
`assetlinks.json` file at:

```
https://bayhaqy.my.id/.well-known/assetlinks.json
```

Use `bubblewrap assetlinks` to generate the file content after the first build.

## Configuration

Edit `twa-manifest.json` to change:
- `packageId` — the Android package name (must be unique)
- `appVersionName` / `appVersionCode` — bump these for each release
- `themeColor` — status bar color (matches the site's red `#B91C1C`)
- `shortcuts` — app shortcuts shown on long-press of the launcher icon
- `startUrl` — the initial URL loaded by the app (currently `/apps/`)

## Releasing a new version

1. Bump `appVersionCode` (integer) and `appVersionName` (e.g. `1.0.1`) in `twa-manifest.json`.
2. Run `bubblewrap build`.
3. Copy the new `app-release-signed.apk` to `/apps/bayhaqy-apps.apk`.
4. Commit and push — the file is served via GitHub Pages at the download URL.
5. Users who installed the previous APK can install the new one over it (same keystore).

## Troubleshooting

- **`SDK license not accepted`**: Run `bubblewrap update` again and accept all prompts.
- **`Failed to verify assetlinks`**: Ensure `/.well-known/assetlinks.json` is reachable on the live site.
- **APK installs but shows browser URL bar**: The assetlinks verification failed — the TWA falls back to a Custom Tab. Check that the SHA-256 fingerprint in `assetlinks.json` matches the keystore.
- **`Java version mismatch`**: Bubblewrap needs Java 11+. Run `java -version` to check.
