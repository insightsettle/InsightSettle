# Insight mobile app (Flutter)

Client app for buyers and suppliers. The staff console stays on the web.

- **Rules and money:** every action calls the website's mobile API (`/api/v1/<action>`), which runs the same server functions as the web app. Prices, quotes, invoices and the ledger are identical on web and mobile.
- **Reads:** deals, milestones, money movements, invoices and notifications are read through Supabase with the user's own session (row-level security).
- **Languages:** Arabic (default) and English, right-to-left aware. Strings: `lib/l10n_ar.dart`; a test fails if any UI string lacks Arabic.
- **Brand:** official logo (`assets/brand`) and Thmanyah Sans (`assets/fonts`, thmanyah Font License: embedded in the compiled app only, files unmodified).

## Build

CI (`.github/workflows/mobile.yml`) runs analyze, tests, an Android APK and a web build on every change under `mobile/`. The APK is attached to the run as `insight-android-apk`.

Locally (Flutter stable):

```bash
cd mobile
bash tool/prepare_platforms.sh   # creates android/ ios/ web/ with Insight's names and icons
flutter pub get
flutter test
flutter run                      # or: flutter build apk --release
```

Another environment: `--dart-define=SUPABASE_URL=… --dart-define=SUPABASE_PUBLISHABLE_KEY=… --dart-define=INSIGHT_SITE=…`.

## Store release (later)

- **Android:** a release keystore and Play Console account in the Insight entity's name.
- **iOS:** an Apple Developer account in the Insight entity's name (financial-services apps are published by the legal entity), then `flutter build ipa`.
