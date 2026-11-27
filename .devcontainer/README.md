# SG-CONTAINER-001 — VS Code Dev Container

**Status:** Reviewable source implementation. Not built on the user's workstation, not deployed, and not connected to production data.

## Included
- VS Code Dev Container based on Node.js 22.
- Separate non-root API image for `live-framework/IMPLEMENTATION/api`.
- Optional Compose application profile with the API and PostgreSQL 17.
- API liveness health check at `/health`.
- API published only on host loopback (`127.0.0.1:8080)); PostgreSQL has no published host port.
- Dropped Linux capabilities, `no-new-privileges`, read-only API root filesystem and temporary `/tmp`.
- CI tests, Compose validation and API image build without pushing.

## Open in VS Code
1. Install Docker Desktop and Microsoft VS Code.
2. Install the VS Code **Dev Containers** extension (`ms-vscode-remote.remote-containers`) and Docker extension.
3. Clone this repository and open its root folder in VS Code.
4. Run **Dev Containers: Reopen in Container** from the Command Palette.

The default Dev Container starts only the isolated development workspace. It does not start the API or database automatically.

## Start the local application profile
1. Copy `.devcontainer/.env.container.example` to the repository-root `.env`.
2. Replace the local database password with a long random value. Configure an approved test OIDC issuer, JWKS URL and audience before authenticated API use. Never use production credentials or production data.
3. From the repository root:

```bash
docker compose --env-file .env -f .devcontainer/docker-compose.yml --profile application up --build
```

4. Check liveness:

```bash
curl http://127.0.0.1:8080/health
```

The API health endpoint is liveness only; it does not prove database schema readiness, identity readiness or production readiness. Apply separately reviewed schema and RLS migrations to a disposable local database before testing authenticated routes.

Stop services:

```bash
docker compose --env-file .env -f .devcontainer/docker-compose.yml --profile application down
```

The named PostgreSQL volume is retained by default. Removing it with `down -v` permanently deletes that local database volume.

## Tests

```bash
node --test .devcontainer/test/*.test.mjs
npm --prefix live-framework/IMPLEMENTATION/api test
```

## Security and release boundaries
- Never commit `.env`, credentials, access tokens, private keys or production connection strings.
- Do not mount the host Docker socket into the workspace container.
- Do not expose PostgreSQL publicly or use production data.
- No schema migration, identity-provider onboarding, cloud resource creation, image push, deployment, payment, debit order, wallet signing or financial transaction is performed.
- Production requires reviewed database migrations/RLS, identity configuration, secrets management, vulnerability scanning, restore testing, legal/privacy review and separate explicit release approval.
