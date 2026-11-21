---
title: "00 - Architecture Roadmap"
type: roadmap
tags:
  - roadmap
  - dotnet-10
  - rollout-matrix
created: 2026-11-14
---

# 00 - Architecture Roadmap: Distributed .NET 10 & Agentic FinOps

**Master Hubs:** [[00 - Home MOC]] | [[00 - Quick Start Guide]] | [[CLAUDE]] | [[AGENTS]] | [[Prompt Library & AI Copilot]]

> [!IMPORTANT]
> **30-60-90 Day Engineering Rollout Matrix:** Sequence runtime hardening, `Microsoft.Extensions.AI` kernel integration, FinOps circuit breaking, and KEDA autoscaling without coupling business logic to volatile model APIs.

---

## Phase 1 (Days 1–30): Deterministic `.NET 10` Runtime & AOT Foundation

- [ ] Standardize build flags (`net10.0`, `Nullable`, AOT analyzers) from [[Template 03 - Production Release Playbook]].
- [ ] Implement bounded `Channel<T>` ingestion, `HybridCache`, and Polly v8 resilience pipelines per [[01 - .NET 10 Distributed Foundations]].
- [ ] Define bounded supervisor-worker contracts using [[02 - Autonomous AI Agent Topologies]] and [[Concept 04 - Ephemeral Swarm Allocation]].
- [ ] Wire reflection-free plugins via [[03 - Semantic Kernel Integration]] and [[Concept 02 - Native AOT Kernel Wiring]].
- [ ] Validate boundaries with [[Prompt 01 - System Architect]] and [[Prompt 02 - Quality Risk Auditor]], logging decisions in [[Template 01 - ADR Decision Record]].

---

## Phase 2 (Days 31–60): Event-Driven Durability, Token Leases & OpenTelemetry

- [ ] Decouple long-running agent turns over MassTransit + EF Core Outbox per [[04 - Event-Driven AI Orchestration]] and [[Concept 03 - Event Sourced Agent State]].
- [ ] Enforce pre-call token reservations via [[05 - Cloud FinOps for AI Workloads]], [[Concept 01 - Token Budget Leases]], and [[Concept 05 - Tiered Semantic Caching]].
- [ ] Deploy W3C `traceparent` + `gen_ai.*` span/metric pipelines from [[06 - Observability & Telemetry]] and [[Concept 06 - GenAI Distributed Tracing]].
- [ ] Audit cost-per-workflow in [[Template 02 - Unit Economics Matrix]] with [[Prompt 03 - Unit Economics CFO]] and build integration suites with [[Prompt 04 - Verification Gate]].
- [ ] Establish weekly engineering & FinOps reviews using [[SOP 01 - Weekly Sprint Protocol]] and [[SOP 02 - Bottleneck Audit Matrix]].

---

## Phase 3 (Days 61–90): Elastic KEDA Scale, Multi-Tenant Isolation & Chaos Gate

- [ ] Autoscale worker pods on broker lag via KEDA + graceful `SIGTERM` drain in [[07 - Scaling Multi-Agent Systems]].
- [ ] Abstract multi-provider model routing (`DefaultAzureCredential` + local fallback) in [[08 - Future-Proofing the AI Stack]] and [[Concept 09 - Model Cascade Routing]].
- [ ] Enforce adaptive rate limiting ([[Concept 08 - Dynamic Token Backpressure]]), read-only prefetching ([[Concept 07 - Speculative Tool Execution]]), and tenant vector partitioning ([[Concept 10 - Tenant Memory Isolation]]).
- [ ] Rehearse failure modes using [[Prompt 05 - Root Cause Debug]] and [[Prompt 06 - Production Readiness & Chaos Review]], then enforce the merge gate in [[SOP 03 - Scale & Automation Gate]] (mapped spatially on [[00 - Visual Blueprint.canvas]]).
