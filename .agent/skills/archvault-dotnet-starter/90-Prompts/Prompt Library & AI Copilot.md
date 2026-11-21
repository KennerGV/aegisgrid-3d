---
title: "Prompt Library & AI Copilot"
category: "90-Prompts"
type: prompt-pack
tags:
  - prompts
  - ai-copilot
  - dotnet-10
  - code-review
created: 2026-11-14
---

# Prompt Library & AI Copilot: .NET 10 Engineering Specifications

**Navigation:** [[00 - Home MOC]] | [[00 - Quick Start Guide]] | [[CLAUDE]] | [[AGENTS]]

> [!TIP]
> **How to Execute These Specifications:** Run these structured prompts inside **Claude Code (`claude`), Cursor, GitHub Copilot Chat, or OpenAI Codex** with your `.NET 10` repository attached. Each prompt enforces the runtime invariants from [[01 - .NET 10 Distributed Foundations]], [[03 - Semantic Kernel Integration]], and [[05 - Cloud FinOps for AI Workloads]].

---

## 1. Engineering Copilot Catalog

| Specification | Engineering Role | Primary Audit Target | Paired Vault Artifacts |
| :--- | :--- | :--- | :--- |
| [[Prompt 01 - System Architect]] | Principal Distributed `.NET 10` Architect | Service boundaries, bounded `Channel<T>`, `.NET Aspire`, and `IChatClient` topology | [[01 - .NET 10 Distributed Foundations]], [[Template 01 - ADR Decision Record]] |
| [[Prompt 02 - Quality Risk Auditor]] | Staff Reliability & Native AOT Auditor | ThreadPool starvation, `IL2026`/`IL3050` trim blockers, socket exhaustion, and split-brain | [[Concept 02 - Native AOT Kernel Wiring]], [[SOP 02 - Bottleneck Audit Matrix]] |
| [[Prompt 03 - Unit Economics CFO]] | Cloud & AI FinOps Architect | Token lease sizing, semantic cache hit thresholds, model cascade routing, and margin gates | [[05 - Cloud FinOps for AI Workloads]], [[Template 02 - Unit Economics Matrix]] |
| [[Prompt 04 - Verification Gate]] | Principal Test & Determinism Engineer | `Microsoft.Testing.Platform`, `FakeTimeProvider`, `Testcontainers`, and contract invariants | [[04 - Event-Driven AI Orchestration]], [[SOP 03 - Scale & Automation Gate]] |
| [[Prompt 05 - Root Cause Debug]] | Staff Production Incident Responder | OpenTelemetry `gen_ai.*` trace correlation, `dotnet-counters`, GC pauses, and DLQ replay | [[06 - Observability & Telemetry]], [[Concept 06 - GenAI Distributed Tracing]] |
| [[Prompt 06 - Production Readiness & Chaos Review]] | Principal SRE & Chaos Engineering Lead | KEDA autoscale behavior, `SIGTERM` drain, upstream `429` storms, and canary rollback gates | [[07 - Scaling Multi-Agent Systems]], [[Template 03 - Production Release Playbook]] |

---

## 2. Recommended Execution Workflow

1. **Design & Boundary Lock:** Run [[Prompt 01 - System Architect]] before scaffolding new microservices or [[02 - Autonomous AI Agent Topologies]], then commit the trade-offs in [[Template 01 - ADR Decision Record]].
2. **Pre-PR Static & FinOps Audit:** Run [[Prompt 02 - Quality Risk Auditor]] and [[Prompt 03 - Unit Economics CFO]] against modified `.csproj` and `IChatClient` pipelines; validate numbers in [[Template 02 - Unit Economics Matrix]].
3. **CI & Chaos Sign-Off:** Enforce [[Prompt 04 - Verification Gate]] and [[Prompt 06 - Production Readiness & Chaos Review]] prior to production promotion under [[SOP 01 - Weekly Sprint Protocol]] and [[00 - Architecture Roadmap]].
