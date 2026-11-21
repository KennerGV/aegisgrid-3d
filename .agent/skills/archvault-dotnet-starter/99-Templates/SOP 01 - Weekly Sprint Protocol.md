---
id: "sop-01"
title: "SOP 01 - Weekly Sprint Protocol"
category: "99-Templates"
type: sop
tags:
  - sop
  - platform-engineering
  - slo-review
  - finops-cadence
created: 2026-11-14
---

# SOP 01 - Weekly Platform & AI Reliability Sprint Protocol

**Navigation:** [[00 - Home MOC]] | [[00 - Architecture Roadmap]] | [[05 - Cloud FinOps for AI Workloads]] | [[06 - Observability & Telemetry]]

---

## Weekly Engineering Cadence

| Day | Ritual (30-45 min) | Primary Telemetry / Artifact | Concrete Exit Deliverable |
| :--- | :--- | :--- | :--- |
| **Monday** | **SLO, Error-Budget & FinOps Review** | [[06 - Observability & Telemetry]] + [[Template 02 - Unit Economics Matrix]] | Freeze non-reliability features if error budget burn `> 25%/wk` or uncached token spend drifted `> 15%` above baseline. |
| **Tuesday** | **ADR & Boundary Design Lock** | [[Prompt 01 - System Architect]] + [[Template 01 - ADR Decision Record]] | Approve bounded-channel capacities, MassTransit saga contracts, and `JsonSerializerContext` schemas before coding. |
| **Wednesday** | **Mid-Sprint Trim & Bottleneck Audit** | [[Prompt 02 - Quality Risk Auditor]] + [[SOP 02 - Bottleneck Audit Matrix]] | Resolve `IL2026`/`IL3050` warnings, ThreadPool queue growth, and slow outbox queries while diffs are small. |
| **Thursday** | **Adversarial & Chaos Verification** | [[Prompt 04 - Verification Gate]] + [[Prompt 06 - Production Readiness & Chaos Review]] | Run `Testcontainers` concurrency suite + simulated upstream `429` failover to secondary `IChatClient` provider. |
| **Friday** | **Canary Release & Ledger Reconciliation** | [[Template 03 - Production Release Playbook]] + [[SOP 03 - Scale & Automation Gate]] | Promote signed container digest, archive prompt evaluation metrics, and update tenant cost-per-workflow benchmarks. |

---

## Linked Vault References

- **Modules & Concepts:** [[01 - .NET 10 Distributed Foundations]] · [[04 - Event-Driven AI Orchestration]] · [[05 - Cloud FinOps for AI Workloads]] · [[Concept 04 - Ephemeral Swarm Allocation]] · [[Concept 09 - Model Cascade Routing]]
- **Agent Contracts:** [[CLAUDE]] · [[AGENTS]] · [[00 - Quick Start Guide]]
