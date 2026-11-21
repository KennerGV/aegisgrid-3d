---
id: "sop-02"
title: "SOP 02 - Bottleneck Audit Matrix"
category: "99-Templates"
type: sop
tags:
  - sop
  - performance
  - threadpool
  - diagnostics
  - dotnet-10
created: 2026-11-14
---

# SOP 02 - .NET 10 & Agentic Bottleneck Audit Matrix

**Navigation:** [[00 - Home MOC]] | [[01 - .NET 10 Distributed Foundations]] | [[06 - Observability & Telemetry]] | [[Prompt 05 - Root Cause Debug]]

---

## Production Symptom-to-Remediation Matrix

| Observable Symptom / Metric | Primary Root Cause | Fast Verification Signal | Surgical `.NET 10` Fix |
| :--- | :--- | :--- | :--- |
| **`ThreadPool` Queue Length Spikes while CPU `< 40%`** | Sync-over-async (`.Result` / `.Wait()`) or blocking DB/IO calls inside request handlers | `dotnet-counters`: `ThreadPool Queue Length > 50` & `Thread Count` climbing | Propagate `async/await` + `CancellationToken` end-to-end; offload burst ingress to bounded `Channel<T>` ([[01 - .NET 10 Distributed Foundations]]). |
| **Ephemeral Port Exhaustion (`SocketException`)** | Instantiating `new HttpClient()` per tool or LLM request | High `TIME_WAIT` socket count on container host | Register typed clients via `AddHttpClient` + `AddStandardResilienceHandler()` with pooled connection lifetimes. |
| **Gen2 GC Pauses & Memory Sawtooth (`LOH > 85 KB`)** | Buffering large JSON/RAG payloads into `string` / `byte[]` or unbounded `ChatHistory` | `gc-heap-size` + `loh-size` climbing linearly with concurrent turns | Stream UTF-8 via `System.IO.Pipelines` + source-generated `JsonSerializerContext` ([[Concept 02 - Native AOT Kernel Wiring]]) and summarize/window `ChatHistory`. |
| **Upstream LLM `429` Retry Storm** | Naive exponential retries firing simultaneously across `N` scaled worker pods | `gen_ai` error rate spikes alongside rising `Retry-After` headers | Enable jittered Polly v8 circuit breaker + adaptive `TokenBucketRateLimiter` ([[Concept 08 - Dynamic Token Backpressure]]) + fallback provider ([[08 - Future-Proofing the AI Stack]]). |
| **Cache Stampede on Cold Keys** | Parallel pods recomputing identical embeddings/completions on TTL expiry | Simultaneous identical upstream calls for the same canonical hash | Route L1/L2 reads through `.NET 10` `HybridCache.GetOrCreateAsync` single-flight stampede protection ([[Concept 05 - Tiered Semantic Caching]]). |
| **Duplicate Side Effects Under Broker Rebalance** | Missing idempotency guard when consumer lease expires mid-LLM turn | Duplicate rows/webhooks sharing the same `WorkflowId` | Enforce EF Core Transactional Outbox + unique `(WorkflowId, StepIndex)` inbox constraint ([[04 - Event-Driven AI Orchestration]]). |

---

## Linked Vault References

- **Diagnostics & Copilots:** [[Prompt 02 - Quality Risk Auditor]] · [[Prompt 05 - Root Cause Debug]] · [[Concept 06 - GenAI Distributed Tracing]]
- **Scale & Release Gates:** [[07 - Scaling Multi-Agent Systems]] · [[SOP 01 - Weekly Sprint Protocol]] · [[SOP 03 - Scale & Automation Gate]] · [[CLAUDE]]
