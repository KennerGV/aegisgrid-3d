---
id: "template-01"
title: "Template 01 - ADR Decision Record"
category: "99-Templates"
type: template
tags:
  - adr
  - governance
  - architecture-decision
  - dotnet-10
created: 2026-11-14
---

# Template 01 - Architecture Decision Record (ADR)

**Navigation:** [[00 - Home MOC]] | [[00 - Architecture Roadmap]] | [[Prompt 01 - System Architect]] | [[CLAUDE]]

```markdown
# ADR-[NNNN]: [Short Imperative Decision Title, e.g., Adopt Microsoft.Extensions.AI + Bounded Channel Ingress]

- **Status:** Proposed | Accepted | Superseded by ADR-[XXXX]
- **Date:** YYYY-MM-DD
- **Deciders:** [Principal Architect, Staff Platform Lead, Security/FinOps Reviewer]
- **Bounded Context:** [Service / Agent Worker Name]

## 1. Context & Problem Statement
Describe the concrete runtime, reliability, latency, or FinOps pressure forcing this decision (include target req/s, p99 latency budget, and per-workflow token ceiling).

## 2. Evaluated Options

| Dimension | Option A (Selected) | Option B | Option C (Status Quo) |
| :--- | :--- | :--- | :--- |
| **p99 Latency / Cold Start** | e.g., `< 120ms` Native AOT | `~1.8s` JIT | `~2.4s` JIT + reflection |
| **Failure / Backpressure Mode** | Bounded `Channel<T>` + `429` | Unbounded memory growth | Synchronous thread blocking |
| **Cost per 100K Workflows** | `$180 - $260` (SLM cascade) | `$950+` (single frontier tier) | Unmetered |
| **Operational Complexity** | Medium (source-gen + outbox) | Low | High incident rate |

## 3. Decision & Non-Negotiable Invariants
State the chosen architecture and the compile-time or CI checks enforcing it:
- [ ] Zero vendor SDK types leaked into `Domain` or `Application` assemblies.
- [ ] `dotnet publish /p:PublishAot=true` passes with `0` `IL2026`/`IL3050` warnings.
- [ ] `TokenBudgetLease` + OpenTelemetry `gen_ai.*` spans wrap every model invocation.

## 4. Rollback & Kill-Switch Plan
Specify the exact feature flag, `IChatClient` routing toggle, or canary traffic weight (`0%`) that reverts this change in under 5 minutes without schema data loss.
```

---

## Linked Vault References

- **Architecture & Concepts:** [[01 - .NET 10 Distributed Foundations]] · [[02 - Autonomous AI Agent Topologies]] · [[08 - Future-Proofing the AI Stack]] · [[Concept 01 - Token Budget Leases]] · [[Concept 02 - Native AOT Kernel Wiring]]
- **Review Copilots & Runbooks:** [[Prompt 01 - System Architect]] · [[Prompt 02 - Quality Risk Auditor]] · [[Template 02 - Unit Economics Matrix]] · [[00 - Visual Blueprint.canvas]]
