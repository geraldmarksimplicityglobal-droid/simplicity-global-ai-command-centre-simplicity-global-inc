# Rooted folder map

```text
live-framework/
├── ARCHITECTURE-LIBRARY/{modules,schemas,governance}/
├── AGENTIC-MULTI-IDE-CLI/{src,test}/
├── BACKGROUND-RUNNERS/{src,schemas,test}/
├── DOMAIN-REGISTRAR/
│   ├── config/
│   ├── modules/SG-DOM-001 ... SG-DOM-024/
│   ├── src/{core,domain,modules,providers,adapters}/
│   ├── database/scripts/test/
└── IMPLEMENTATION/{api,identity/github-enterprise,web}/
```

| Root | Module | Responsibility |
|---|---|---|
| ARCHITECTURE-LIBRARY | SG-ARCH-LIB-001 | Canonical registry and boundaries |
| AGENTIC-MULTI-IDE-CLI | SG-AGENTIC-MULTI-IDE-CLI-001 | Governed IDE/CLI task workflow |
| BACKGROUND-RUNNERS | SG-RUN-001–010 | Bounded build, retry, evidence and GLOBAL MARK |
| DOMAIN-REGISTRAR | SG-DOM-001–024 | Provider-neutral registrar system |
| IMPLEMENTATION/identity/github-enterprise | SG-ID-001 | Brokered GitHub Enterprise sign-in |
| IMPLEMENTATION/api | SG-LIVE-API-001 | API authentication, authorization and audit |

This is a source-tree declaration, not a live connectivity claim.
