# Architecture

## Control plane
The application coordinates domain inventory, registrar adapters, DNS adapters, ownership verification, sitemap metadata, audit evidence and approval state. It does not own provider credentials.

## Data plane
Provider adapters are isolated behind a narrow contract. The only implemented provider is an offline mock. Future adapters must be independently reviewed and capability-limited.

## Trust boundaries
1. User/operator interface.
2. Application service and policy gate.
3. Provider adapter.
4. Registrar/DNS/hosting external control planes.

No adapter may bypass the approval gate. A browser UI must never receive registrar API secrets.

## Five-target topology
- Standalone: portable package and local test harness.
- GitHub: version-controlled canonical source.
- Windows: primary development host; no local service installed by this commit.
- Termux: secondary runtime; no package installed by this commit.
- Webstudio: presentation layer consuming a future authenticated API; not connected by this commit.
