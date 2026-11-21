---
id: "concept-07"
title: "Concept 07 - Speculative Tool Execution"
category: "80-Concepts"
type: zettelkasten-concept
tags:
  - zettelkasten
  - speculative-execution
  - latency
  - idempotency
created: 2026-11-14
---

# Concept 07 - Speculative Tool Execution

**First-Principles Claim:** Speculative parallel prefetching cuts multi-turn agent tail latency (`p99`), but is safe **if and only if** the candidate tool is marked strictly **side-effect-free (`IsPureReadOnly == true`)** and aborts immediately via `CancellationToken` when the planner selects a different branch.

---

## Side-Effect Invariant

Never speculatively invoke mutating tools (ticket creation, SQL writes, webhook dispatches). Restrict prefetching to pure read projections (e.g., tenant metadata, pod status, feature flags) overlapped with initial intent classification:

```csharp
namespace ArchVault.DotNet10.Concepts;

[AttributeUsage(AttributeTargets.Method)]
public sealed class PureReadOnlyToolAttribute : Attribute;

public static class SpeculativeReadPrefetcher
{
    public static async Task<TContext?> PrefetchWhilePlanningAsync<TContext>(
        Func<CancellationToken, Task<bool>> plannerNeedsContextAsync,
        Func<CancellationToken, Task<TContext>> pureReadFetchAsync,
        CancellationToken ct) where TContext : class
    {
        using var prefetchCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var prefetchTask = pureReadFetchAsync(prefetchCts.Token);

        if (await plannerNeedsContextAsync(ct))
        {
            return await prefetchTask;
        }

        await prefetchCts.CancelAsync(); // Reclaim socket/DB work immediately on branch miss
        return null;
    }
}
```

---

## Lateral Graph Links

- **Concept Chain:** [[Concept 06 - GenAI Distributed Tracing]] ↔ [[Concept 08 - Dynamic Token Backpressure]] · [[Concept 01 - Token Budget Leases]] · [[Concept 03 - Event Sourced Agent State]]
- **Applied In:** [[02 - Autonomous AI Agent Topologies]] · [[04 - Event-Driven AI Orchestration]] · [[07 - Scaling Multi-Agent Systems]] · [[08 - Future-Proofing the AI Stack]]
- **Governance & Hubs:** [[00 - Home MOC]] · [[00 - Architecture Roadmap]] · [[Prompt 01 - System Architect]] · [[Prompt 02 - Quality Risk Auditor]] · [[Prompt Library & AI Copilot]] · [[Template 01 - ADR Decision Record]]
