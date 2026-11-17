# GEN SYSTEM scheduler build status

The Python scheduler is a planning-only component. It does not start agents or execute commands.

Validation workflow: `.github/workflows/sg-studio-ci.yml`
Checks: Python bytecode compilation, unit tests, and JSON task-plan generation.

A previous CI attempt exposed an escaped newline in `sg_studio/__init__.py`. That initializer has been corrected in commit history. This commit triggers a fresh validation run; status must be read from GitHub Actions before declaring the Python scheduler validated.

This status does not represent a DeepSeek Harness Android APK build.
