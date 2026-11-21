---
id: root-agents-dotnet10
title: "AGENTS"
category: "00-Hubs"
tags:
  - coding-agents
  - cursor
  - copilot
  - codex
  - antigravity
updated: 2026-11-14
---

# AGENTS.md — Universal Multi-Agent Engineering Rules (Cursor, Copilot, Codex & Antigravity)

This file configures **Cursor, GitHub Copilot, OpenAI Codex, Windsurf, and Google Antigravity** to treat **Blueprint Starter .NET 10** as an authoritative architecture and code-review specification. Pair with [[CLAUDE]] and [[00 - Home MOC]].

---

## 1. Task-to-Blueprint Routing Table

Before generating or modifying code, load the matching specification from this vault:

| Engineering Task | Mandatory Vault Blueprints |
| :--- | :--- |
| **Microservice bootstrap, `HybridCache`, Polly v8 & bounded channels** | [[01 - .NET 10 Distributed Foundations]], [[Concept 02 - Native AOT Kernel Wiring]], [[Template 03 - Production Release Playbook]] |
| **Multi-agent supervisor/worker DAGs & scoped execution** | [[02 - Autonomous AI Agent Topologies]], [[Concept 04 - Ephemeral Swarm Allocation]], [[Prompt 01 - System Architect]] |
| **`Microsoft.Extensions.AI` (`IChatClient`) & Semantic Kernel plugins** | [[03 - Semantic Kernel Integration]], [[08 - Future-Proofing the AI Stack]], [[Concept 07 - Speculative Tool Execution]] |
| **MassTransit sagas, Kafka/Service Bus & transactional outbox** | [[04 - Event-Driven AI Orchestration]], [[Concept 03 - Event Sourced Agent State]], [[Concept 08 - Dynamic Token Backpressure]] |
| **Token cost ceilings, semantic caching & model cascade routing** | [[05 - Cloud FinOps for AI Workloads]], [[Concept 01 - Token Budget Leases]], [[Concept 05 - Tiered Semantic Caching]], [[Concept 09 - Model Cascade Routing]], [[Template 02 - Unit Economics Matrix]] |
| **OpenTelemetry `gen_ai.*` spans, metrics & incident triage** | [[06 - Observability & Telemetry]], [[Concept 06 - GenAI Distributed Tracing]], [[Prompt 05 - Root Cause Debug]], [[SOP 02 - Bottleneck Audit Matrix]] |
| **Kubernetes KEDA queue autoscaling & multi-tenant isolation** | [[07 - Scaling Multi-Agent Systems]], [[Concept 10 - Tenant Memory Isolation]], [[SOP 03 - Scale & Automation Gate]], [[Prompt 06 - Production Readiness & Chaos Review]] |

---

## 2. Mandatory Code-Generation Checklist

- **Target Framework:** `net10.0` with `<Nullable>enable</Nullable>`, `<ImplicitUsings>enable</ImplicitUsings>`, and `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`.
- **Time & Testability:** Inject `TimeProvider` rather than calling `DateTime.UtcNow` directly so resilience windows and leases remain deterministically testable under [[Prompt 04 - Verification Gate]].
- **HTTP & Resilience:** Register typed clients via `IHttpClientFactory` + `AddStandardResilienceHandler()` or explicit named `ResiliencePipeline` policies; never `new HttpClient()` per call.
- **Architectural Decisions:** Record trade-offs using [[Template 01 - ADR Decision Record]], audit risks via [[Prompt 02 - Quality Risk Auditor]], and review weekly SLOs through [[SOP 01 - Weekly Sprint Protocol]].
- **Onboarding & Spatial View:** Start humans at [[00 - Quick Start Guide]], [[00 - Architecture Roadmap]], and [[00 - Visual Blueprint.canvas]].
