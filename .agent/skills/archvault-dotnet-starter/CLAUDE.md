---
id: root-claude-dotnet10
title: "CLAUDE"
category: "00-Hubs"
tags:
  - claude-code
  - dotnet-10
  - native-aot
  - microsoft-extensions-ai
updated: 2026-11-14
---

# CLAUDE.md — Executable .NET 10 Architecture & AI Runtime Contract

Point **Claude Code** (`claude`) directly at this directory (or copy this `CLAUDE.md` alongside the vault into your `.NET 10` repository) to audit microservices, `.NET Aspire` orchestrations, `Microsoft.Extensions.AI` pipelines, and Cloud FinOps guardrails against the 36 interconnected specifications in **Blueprint Starter .NET 10**.

---

## 1. Non-Negotiable Architectural Invariants (`net10.0`)

Whenever authoring, refactoring, or reviewing C# 14 / `.NET 10` code against this vault, enforce every rule below:

1. **Zero Unbounded In-Memory Queues ([[01 - .NET 10 Distributed Foundations]]):**
   - Reject `Channel.CreateUnbounded<T>()`, fire-and-forget `Task.Run`, or unthrottled `Task.WhenAll` over external I/O. Require `Channel.CreateBounded<T>` with explicit `BoundedChannelFullMode` and cancellation propagation.
2. **Native AOT & Trim-Clean Serialization ([[Concept 02 - Native AOT Kernel Wiring]] & [[03 - Semantic Kernel Integration]]):**
   - Never use `dynamic`, `BinaryFormatter`, or unannotated `JsonSerializer.Serialize(obj)` on hot paths. Mandate source-generated `JsonSerializerContext` (`[JsonSerializable]`) and `<EnableConfigurationBindingGenerator>true</EnableConfigurationBindingGenerator>` so `dotnet publish /p:PublishAot=true` emits zero `IL2026` or `IL3050` warnings.
3. **Vendor-Agnostic AI Abstractions ([[08 - Future-Proofing the AI Stack]] & [[03 - Semantic Kernel Integration]]):**
   - Never couple domain services directly to vendor SDK clients (`OpenAIClient`, raw HTTP). Inject `Microsoft.Extensions.AI.IChatClient` wrapped with `UseFunctionInvocation()`, `UseOpenTelemetry()`, and token-budget middleware; avoid deprecated Semantic Kernel `HandlebarsPlanner` or `StepwisePlanner`.
4. **Zero Static Cloud Keys in Configuration ([[08 - Future-Proofing the AI Stack]] & [[Template 03 - Production Release Playbook]]):**
   - Reject `AzureKeyCredential` or plaintext API keys in `appsettings.json`. Authenticate to Azure OpenAI, Service Bus, and Key Vault via `DefaultAzureCredential` (Workload Identity) and `.NET Aspire` service discovery.
5. **Pre-Execution Token Leases & FinOps Breakers ([[05 - Cloud FinOps for AI Workloads]] & [[Concept 01 - Token Budget Leases]]):**
   - Every multi-turn agent workflow must acquire a bounded token/micro-dollar lease before invoking frontier models and enforce `MaximumIterationsPerRequest` (`<= 5`) on tool-calling loops.
6. **End-to-End W3C `Activity` Lineage & PII Scrubbing ([[06 - Observability & Telemetry]] & [[Concept 06 - GenAI Distributed Tracing]]):**
   - Propagate `ActivityContext` (`traceparent`) across `Channel<T>`, MassTransit/Kafka headers, and `IChatClient` calls while redacting credentials and PII prior to OTLP export.

---

## 2. Ready-to-Run Claude Code Audit Commands

```bash
# Audit a .NET solution for thread-pool starvation, AOT trim blockers, and unbounded queues
claude "Read CLAUDE.md, 01-Architecture/01 - .NET 10 Distributed Foundations.md, and 99-Templates/SOP 02 - Bottleneck Audit Matrix.md, then audit ./src for unbounded queues, reflection blockers, missing CancellationTokens, and socket exhaustion."

# Upgrade legacy Semantic Kernel or raw OpenAI SDK code to Microsoft.Extensions.AI
claude "Follow 02-Implementation/03 - Semantic Kernel Integration.md and 04-Growth-Scale/08 - Future-Proofing the AI Stack.md to refactor our LLM client into a Native-AOT-safe IChatClient pipeline with token budget middleware."

# Generate a production Directory.Build.props + GitHub Actions AOT & Testcontainers gate
claude "Apply 99-Templates/Template 03 - Production Release Playbook.md and 99-Templates/SOP 03 - Scale & Automation Gate.md to scaffold Directory.Build.props and .github/workflows/dotnet10-aot-gate.yml."
```

---

## 3. Vault Index Cross-References

- **Executive Entrypoints:** [[00 - Home MOC]] · [[00 - Quick Start Guide]] · [[00 - Architecture Roadmap]] · [[AGENTS]] · [[00 - Visual Blueprint.canvas]]
- **Core Architecture & Implementation:** [[01 - .NET 10 Distributed Foundations]] · [[02 - Autonomous AI Agent Topologies]] · [[03 - Semantic Kernel Integration]] · [[04 - Event-Driven AI Orchestration]]
- **Operations, FinOps & Scale:** [[05 - Cloud FinOps for AI Workloads]] · [[06 - Observability & Telemetry]] · [[07 - Scaling Multi-Agent Systems]] · [[08 - Future-Proofing the AI Stack]]
- **Governance, Prompts & Runbooks:** [[Prompt Library & AI Copilot]] · [[Prompt 01 - System Architect]] · [[Template 01 - ADR Decision Record]] · [[Template 02 - Unit Economics Matrix]] · [[SOP 02 - Bottleneck Audit Matrix]] · [[SOP 03 - Scale & Automation Gate]]
