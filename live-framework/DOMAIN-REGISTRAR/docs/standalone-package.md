# Standalone package

The existing `live-framework/DOMAIN-REGISTRAR` directory is the portable package root. It is intentionally kept inside the current repository until a standalone export is explicitly reviewed.

Requirements:
- Node.js 20+
- No runtime dependencies
- Mock provider only
- Offline tests
- No provider credentials
- No external network calls

To create a separate standalone distribution later, export this directory from a reviewed Git commit. Do not copy secrets, local .env files, build outputs or repository history into the release archive.
