# Debug APK Artifact

The CI workflow retains the debug APK as a short-lived GitHub Actions artifact named `sg-android-engineering-debug-apk` for seven days after a successful build. This is a development build, not a production-signed release. It must not be distributed as a production app.
