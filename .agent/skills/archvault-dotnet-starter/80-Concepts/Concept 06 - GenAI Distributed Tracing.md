---
id: "concept-06"
title: "Concept 06 - GenAI Distributed Tracing"
category: "80-Concepts"
type: zettelkasten-concept
tags:
  - zettelkasten
  - opentelemetry
  - w3c-traceparent
  - async-channels
created: 2026-11-14
---

# Concept 06 - GenAI Distributed Tracing

**First-Principles Claim:** Writing an item into an in-memory `Channel<T>` or external Kafka topic severs `Activity.Current` execution context unless the producer explicitly captures **`ActivityContext` (`traceparent` + `tracestate`)** on enqueue and links a child span on dequeue.

---

## Preserving Causal Lineage Across Async Hops

Without explicit `ActivityContext` capture, background agent workers emit orphan root traces disconnected from the originating HTTP request or parent supervisor turn ([[06 - Observability & Telemetry]]):

```csharp
using System.Diagnostics;

namespace ArchVault.DotNet10.Concepts;

public readonly record struct TracedWorkItem<TPayload>(
    TPayload Payload,
    ActivityContext ParentTraceContext);

public static class TracedChannelBridge
{
    private static readonly ActivitySource Source = new("ArchVault.Tracing.ChannelBridge");

    public static TracedWorkItem<T> Capture<T>(T payload) =>
        new(payload, Activity.Current?.Context ?? default);

    public static Activity? StartConsumerSpan<T>(in TracedWorkItem<T> item, string spanName) =>
        Source.StartActivity(spanName, ActivityKind.Consumer, parentContext: item.ParentTraceContext);
}
```

---

## Lateral Graph Links

- **Concept Chain:** [[Concept 05 - Tiered Semantic Caching]] ↔ [[Concept 07 - Speculative Tool Execution]] · [[Concept 02 - Native AOT Kernel Wiring]] · [[Concept 10 - Tenant Memory Isolation]]
- **Applied In:** [[03 - Semantic Kernel Integration]] · [[04 - Event-Driven AI Orchestration]] · [[06 - Observability & Telemetry]] · [[AGENTS]]
- **Governance & Hubs:** [[00 - Home MOC]] · [[00 - Architecture Roadmap]] · [[Prompt 01 - System Architect]] · [[Prompt 06 - Production Readiness & Chaos Review]] · [[SOP 01 - Weekly Sprint Protocol]] · [[SOP 03 - Scale & Automation Gate]]
