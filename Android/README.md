# Neext Pay SMS gateway

Native Android 6.0+ gateway for bKash, Nagad, Upay and Rocket. Uses the website's logo and emerald theme. Only matching incoming payment messages are queued; there is no inbox scraping or fabricated SMS counter.

## Build locally
Install Android Studio, JDK 17 and Android SDK 35. Open this Android folder in Android Studio, or use the included Gradle wrapper from VS Code's terminal:

```sh
./gradlew :app:testDebugUnitTest :app:assembleRelease
```

Windows: `gradlew.bat :app:testDebugUnitTest :app:assembleRelease`.

Release output is unsigned by default. Use Android Studio's Generate Signed Bundle / APK with your own private keystore. Keep that keystore and password safe: future updates must use the same key. Never commit them. A provided downloadable build uses a separate generated distribution key; locally signed builds cannot update it without uninstalling first.

## Connect
Enter the HTTPS gateway site URL (or full `/api/public/gateway/ingest` URL), an active **SMS/ingest** API key from admin, and the receiving wallet number on this phone. Grant SMS and notification permissions, review battery/autostart settings, then Start gateway. Use a separate device/configuration for each receiving wallet; this build does not auto-detect dual-SIM receiving accounts.

Status notification and dashboard show received, sent, queued and matched counts. Sent means the API accepted the batch, not that every message matched a payment. Offline rows remain in SQLite and retry with network constraints and exponential backoff. The recovery job runs at Android's permitted intervals, not an exact timer. API errors remain visible with settings/retry controls.

## Device checks still required
Test all four provider messages, permission denial/grant, screen off, offline recovery, reboot and manufacturer battery restrictions on your own phone. Force-stop, permission revocation, uninstall, or manufacturer policies can stop operation; no Android app can guarantee perpetual background execution. Google Play restricts SMS permissions; this APK is intended for controlled sideloading, not a claim of Play approval.