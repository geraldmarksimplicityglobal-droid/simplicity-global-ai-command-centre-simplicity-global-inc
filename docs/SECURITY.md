# Security and execution boundaries

## Initial state

This release is a planning-only orchestration core. It does not launch agents, execute commands, create workspaces, access repositories, or make network requests.

## Mandatory controls for a future worker adapter

1. Each task receives a unique identity and isolated workspace.
2. Shared integration is performed only through reviewed patches.
3. File writes, command execution, package installation, network access and deployment are disabled unless a separate approval mechanism is implemented and validated.
4. Approval must bind to an exact action ID and exact scope. Any material change invalidates approval.
5. Worker output is untrusted input and must be validated before integration.
6. Credentials must never be included in task prompts, logs, patches or audit output.
7. Concurrency must be bounded by measured CPU, memory, provider quotas, budget and review throughput.
8. Cancellation and failure must stop dependent tasks from being scheduled.
9. Preserve existing files and uncommitted work; never assume a workspace is disposable.
10. Do not represent logical tasks as deployed agents.

## Scaling

The 1,000 value is a maximum logical task/worker planning target. It is not a supported simultaneous process count. Increase concurrency only after load, failure, cost and review-capacity measurements.
