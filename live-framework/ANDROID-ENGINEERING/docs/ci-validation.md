# CI Validation Notes

The Android CI workflow uses the runner-provided Android command-line tools and requests only `platform-tools` from the setup action. The workflow then installs Android SDK Platform 35 and Build Tools 35.0.0 explicitly. This avoids requesting the retired SDK package named `tools`.

A successful CI run must complete both repository-side Node tests and the Gradle Kotlin unit-test/debug-APK build. Do not report Android compilation as validated until that workflow run is green.
