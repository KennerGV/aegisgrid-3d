---
id: "sop-03"
title: "SOP 03 - Scale & Automation Gate"
category: "99-Templates"
type: sop
tags:
  - sop
  - github-actions
  - native-aot
  - cicd
  - keda
created: 2026-11-14
---

# SOP 03 - CI/CD Native AOT, Testcontainers & KEDA Scale Gate

**Navigation:** [[00 - Home MOC]] | [[07 - Scaling Multi-Agent Systems]] | [[Template 03 - Production Release Playbook]] | [[Prompt 04 - Verification Gate]]

---

## 1. Copy-Ready `.github/workflows/dotnet10-aot-gate.yml`

Every pull request must prove clean warnings-as-errors compilation, real containerized outbox/lease concurrency (`Testcontainers`), and zero-warning Native AOT trimming before merge:

```yaml
name: dotnet10-aot-and-verification-gate

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

env:
  DOTNET_NOLOGO: true
  DOTNET_CLI_TELEMETRY_OPTOUT: true

jobs:
  verify-and-publish-aot:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup .NET 10 SDK
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "10.0.x"

      - name: Restore dependencies
        run: dotnet restore --locked-mode

      - name: Build with Warnings-as-Errors & Trim Analyzers
        run: dotnet build --no-restore -c Release -warnaserror

      - name: Run xUnit + Testcontainers Integration Suite
        run: dotnet test --no-build -c Release --logger "trx;LogFileName=test-results.trx"

      - name: Verify Native AOT Publish (Zero IL2026 / IL3050 Warnings)
        run: dotnet publish ./src/ArchVault.AgentWorker/ArchVault.AgentWorker.csproj -c Release -r linux-x64 /p:PublishAot=true /p:WarnAsError=IL2026,IL3050 -o ./artifacts/aot-worker
```

---

## 2. Production Promotion Gate Criteria

- [ ] **Trim & AOT Gate:** `0` `IL2026` (RequiresUnreferencedCode) and `0` `IL3050` (RequiresDynamicCode) warnings across worker and gateway binaries ([[Concept 02 - Native AOT Kernel Wiring]]).
- [ ] **State & FinOps Gate:** `Testcontainers` suite confirms atomic `TokenBudgetLease` enforcement ([[Concept 01 - Token Budget Leases]]) and idempotent outbox replay ([[Concept 03 - Event Sourced Agent State]]).
- [ ] **Elastic KEDA Gate:** Load test verifies smooth scale-out from `0 -> N` replicas on queue lag and zero dropped in-flight turns on scale-in (`SIGTERM` drain verified via [[Prompt 06 - Production Readiness & Chaos Review]]).

---

## Linked Vault References

- **Architecture & Operations:** [[04 - Event-Driven AI Orchestration]] · [[06 - Observability & Telemetry]] · [[07 - Scaling Multi-Agent Systems]] · [[08 - Future-Proofing the AI Stack]]
- **Governance & Contracts:** [[Template 03 - Production Release Playbook]] · [[SOP 01 - Weekly Sprint Protocol]] · [[SOP 02 - Bottleneck Audit Matrix]] · [[CLAUDE]] · [[AGENTS]]
