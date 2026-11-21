---
id: "prompt-05"
title: "Prompt 05 - Root Cause Debug"
category: "90-Prompts"
type: ai-prompt
tags:
  - ai-copilot
  - incident-response
  - opentelemetry
  - diagnostics
created: 2026-11-14
---

# Prompt 05 - Root Cause Debug (OpenTelemetry & Runtime Triage)

**Navigation:** [[00 - Home MOC]] | [[Prompt Library & AI Copilot]] | [[06 - Observability & Telemetry]] | [[SOP 02 - Bottleneck Audit Matrix]]

> [!CAUTION]
> **Evidence Before Patching:** During production incidents (p99 latency spikes, dead-letter queue surges, or `OutOfMemoryException` restarts), forbid speculative config tweaks until a falsifiable root-cause hypothesis is tied to trace/metric evidence.

---

## Copy-Ready Specification Prompt

```markdown
Role: Staff .NET 10 Production Diagnostics & Distributed Tracing Responder.

Incident Telemetry Provided:
- Failing Symptom & SLO Breach: [PASTE ERROR / LATENCY / DLQ METRIC]
- OpenTelemetry `gen_ai.*` Span Dump (`traceparent` / tags): [PASTE TRACE JSON]
- Runtime Counters (`dotnet-counters` / Prometheus `System.Runtime` & KEDA metrics): [PASTE METRICS]
- Recent Diff or Config Change: [PASTE COMMIT / ENV DIFF]

Triage Protocol:
1. Formulate the top 3 ranked root-cause hypotheses across four fault domains:
   - Runtime starvation (ThreadPool queue length, sync-over-async, LOH/Gen2 GC pinning)
   - Upstream LLM saturation (`429` retry amplification, missing per-attempt timeout, cascade escalation storm)
   - Broker/DB contention (outbox lock wait, poison message retry loop, connection pool exhaustion)
   - Memory/context leak (unbounded `ChatHistory` growth, un-disposed `AsyncServiceScope`)
2. Specify the single fastest diagnostic command or OTLP query to confirm or falsify Hypothesis #1 in under 3 minutes.
3. Provide the minimal surgical hotfix (with immediate feature-flag/config rollback path) + a permanent regression test.
```

---

## Related Vault Blueprints

- **Telemetry & Backpressure:** [[06 - Observability & Telemetry]] · [[Concept 06 - GenAI Distributed Tracing]] · [[Concept 08 - Dynamic Token Backpressure]]
- **Operational Triage Matrices:** [[SOP 02 - Bottleneck Audit Matrix]] · [[Prompt 06 - Production Readiness & Chaos Review]] · [[00 - Visual Blueprint.canvas]]
