---
id: "prompt-01"
title: "Prompt 01 - System Architect"
category: "90-Prompts"
type: ai-prompt
tags:
  - ai-copilot
  - system-architect
  - dotnet-10
  - aspire
created: 2026-11-14
---

# Prompt 01 - System Architect (.NET 10 & Agentic Topology Design)

**Navigation:** [[00 - Home MOC]] | [[Prompt Library & AI Copilot]] | [[01 - .NET 10 Distributed Foundations]] | [[Template 01 - ADR Decision Record]]

> [!IMPORTANT]
> **When to Run:** Invoke before designing a new `.NET 10` service, introducing an autonomous multi-agent workflow, or splitting a modular monolith into event-driven workers.

---

## Copy-Ready Specification Prompt

```markdown
Role: Principal Distributed Systems Architect specializing in .NET 10, C# 14, .NET Aspire, Microsoft.Extensions.AI, and MassTransit.

Context:
- Workload Objective: [DESCRIBE DOMAIN WORKFLOW & TARGET THROUGHPUT]
- Latency & Availability SLO: [e.g., p99 < 800ms sync API / < 15s async agent saga, < 43m/mo downtime budget]
- Token & Compute Ceiling: [e.g., <= 12,000 tokens and <= $0.015 per completed workflow]
- Existing Infrastructure: [e.g., Azure Container Apps / AKS, PostgreSQL, Redis, Azure Service Bus]

Architectural Constraints (Non-Negotiable):
1. Enforce strict Clean Architecture inversion: Domain & Application layers hold zero references to vendor AI SDKs, EF Core, or broker transports.
2. Replace every in-memory queue with bounded `System.Threading.Channels.Channel<T>` (`BoundedChannelFullMode.Wait`) and explicit `CancellationToken` propagation.
3. Wire all LLM interactions through `Microsoft.Extensions.AI.IChatClient` middleware (OpenTelemetry + Token Budget Lease + Polly v8 `ResiliencePipeline`) with source-generated `JsonSerializerContext` for Native AOT compatibility.
4. Persist multi-step state transitions via EF Core Transactional Outbox before publishing broker events.

Required Output:
1. Solution & project dependency matrix (`Domain`, `Application`, `Infrastructure`, `Api`, `Worker`, `AppHost`).
2. Synchronous vs. asynchronous boundary diagram (Mermaid `flowchart LR`) showing backpressure points and dead-letter queues.
3. Exact C# 14 interface contracts for the primary orchestrator, `Channel<T>` ingress pump, and `IChatClient` middleware pipeline.
4. Top 3 failure modes under 10x burst load and concrete mitigations mapped to an ADR summary.
```

---

## Verification & Graph Cross-References

- **Architecture Foundations:** [[01 - .NET 10 Distributed Foundations]] · [[02 - Autonomous AI Agent Topologies]] · [[03 - Semantic Kernel Integration]] · [[04 - Event-Driven AI Orchestration]]
- **Supporting Zettelkasten Primitives:** [[Concept 01 - Token Budget Leases]] · [[Concept 02 - Native AOT Kernel Wiring]] · [[Concept 04 - Ephemeral Swarm Allocation]]
- **Output Artifacts:** Record the approved topology in [[Template 01 - ADR Decision Record]], scaffold solution properties via [[Template 03 - Production Release Playbook]], and link to [[CLAUDE]] · [[AGENTS]] · [[00 - Visual Blueprint.canvas]].
