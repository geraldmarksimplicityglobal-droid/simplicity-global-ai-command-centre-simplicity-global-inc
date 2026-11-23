# Five-target integration matrix

| Target | Canonical role | Deliverable in this package | Verified live connection |
|---|---|---|---|
| Standalone | Portable reference package | This self-contained Node package and documentation | Not yet exported or installed separately |
| GitHub | Canonical source control | Versioned source on the existing feature branch | Repository read/write access verified for this branch |
| HP Windows 11 / Codex | Primary development workstation | Adapter contract and read-only preflight specification | Not connected or inspected |
| Huawei P30 Pro / Termux | Secondary runtime | Adapter contract and read-only preflight specification | Not connected or inspected |
| Webstudio | Management UI | API boundary and security contract | No project connected |

## Integration order

1. Preserve and complete the package in the existing repository.
2. Validate package scripts and offline tests in a controlled development environment.
3. Export a standalone release archive from a reviewed commit.
4. Inspect the HP Windows host before preparing its runtime.
5. Inspect the Huawei Termux host before preparing its runtime.
6. Identify the exact Webstudio project and inspect its existing structure.
7. Connect targets individually using least-privilege credentials and scoped approvals.

No stage inherits permission to perform DNS writes, registrar purchases, transfers, payments, production deployment or external account changes.
