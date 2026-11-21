---
id: "concept-04"
title: "Concept 04 - Ephemeral Swarm Allocation"
category: "80-Concepts"
type: zettelkasten-concept
tags:
  - zettelkasten
  - scoped-di
  - structured-concurrency
  - dotnet-10
created: 2026-11-14
---

# Concept 04 - Ephemeral Swarm Allocation

**First-Principles Claim:** Sub-agents spawned for a parallel decomposition step must execute inside **isolated `AsyncServiceScope` containers** bound to a **linked `CancellationTokenSource`** so failure or timeout in the parent supervisor tears down every child allocation deterministically.

---

## Scoped DI + Linked Cancellation Teardown

Allocating sub-agents from the root `IServiceProvider` leaks `IDisposable` buffers and shares scoped `Kernel` instances across parallel tasks ([[02 - Autonomous AI Agent Topologies]]). Create one `AsyncServiceScope` per sub-agent branch:

```csharp
using Microsoft.Extensions.DependencyInjection;

namespace ArchVault.DotNet10.Concepts;

public static class EphemeralSwarmRunner
{
    public static async Task<TResult[]> RunScopedBranchesAsync<TWorker, TResult>(
        IServiceScopeFactory scopeFactory,
        IReadOnlyList<Func<TWorker, CancellationToken, Task<TResult>>> branches,
        TimeSpan branchDeadline,
        CancellationToken parentCt) where TWorker : notnull
    {
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(parentCt);
        linkedCts.CancelAfter(branchDeadline);

        var tasks = branches.Select(async branch =>
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var worker = scope.ServiceProvider.GetRequiredService<TWorker>();
            return await branch(worker, linkedCts.Token);
        });

        return await Task.WhenAll(tasks);
    }
}
```

---

## Lateral Graph Links

- **Concept Chain:** [[Concept 03 - Event Sourced Agent State]] ↔ [[Concept 05 - Tiered Semantic Caching]] · [[Concept 08 - Dynamic Token Backpressure]] · [[Concept 10 - Tenant Memory Isolation]]
- **Applied In:** [[01 - .NET 10 Distributed Foundations]] · [[02 - Autonomous AI Agent Topologies]] · [[04 - Event-Driven AI Orchestration]] · [[07 - Scaling Multi-Agent Systems]]
- **Governance & Hubs:** [[00 - Home MOC]] · [[00 - Architecture Roadmap]] · [[Prompt 04 - Verification Gate]] · [[Template 02 - Unit Economics Matrix]] · [[SOP 01 - Weekly Sprint Protocol]] · [[00 - Visual Blueprint.canvas]]
