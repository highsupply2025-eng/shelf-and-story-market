# unibook mobile apps

Native Capacitor shells (Android `android/`, iOS `ios/`) with id `store.unibook.app`, loading the published site https://unibook.store. Website changes appear in the apps after publishing; no rebuild needed.

GitHub Actions (`.github/workflows/build-mobile.yml`) builds on push to main or manually (Actions → Build unibook mobile apps → Run workflow):
- Android: signed release APK + AAB. Add secrets ANDROID_KEYSTORE_BASE64 / ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_ALIAS / ANDROID_KEY_PASSWORD to keep one permanent Play upload key.
- iOS: unsigned device compilation bundle + simulator bundle. Not an installable IPA; App Store upload needs Xcode archive with an Apple Developer team.
