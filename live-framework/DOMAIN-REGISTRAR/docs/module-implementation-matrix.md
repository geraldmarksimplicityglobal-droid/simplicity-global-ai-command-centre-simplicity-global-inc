# SG-DOM-001–024 — Module implementation matrix

All 24 manifests are rooted under `config/module-manifests.json` and indexed individually in `modules/SG-DOM-001/` through `modules/SG-DOM-024/`.

| Module family | Source state | Live provider state |
|---|---|---|
| Registrar core, domain registry, availability | Mock/local source | Not connected |
| Registration, renewal, transfer | Disabled contracts | Not enabled |
| DNS, nameservers | Read-only mock / disabled | No DNS provider |
| SSL/TLS, hosting, website manager | Design/reference | Not connected |
| Bing Webmaster, sitemap | Reference/local validation | No property verification |
| Postman, provider connectors | Manual/mock contracts | No live collection execution |
| Billing, identity, permissions | Disabled/design | Not connected |
| Audit, notifications, automation | In-memory/disabled | No durable live service |
| Backup, monitoring, administration | Design/local-only | Not deployed |

`simplicityglobal.com` is a domain reference only. Ownership, registrar account, DNS provider, nameservers, hosting and Bing verification remain unverified.

Activation requires provider selection, read-only inspection, secure authentication, exact change review, separate approval for each external mutation and before/after evidence. The package remains mock-only until a provider adapter is reviewed and authorised.
