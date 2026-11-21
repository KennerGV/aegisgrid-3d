---
id: "concept-01"
title: "Concept 01 - Token Budget Leases"
category: "80-Concepts"
type: zettelkasten-concept
tags:
  - zettelkasten
  - finops
  - token-leases
  - dotnet-10
created: 2026-11-14
---

# Concept 01 - Token Budget Leases

**First-Principles Claim:** Post-call token accounting cannot prevent concurrent sub-agents from overshooting a tenant's quota simultaneously; multi-agent `.NET 10` runtimes must acquire a **time-bounded pre-execution Token Lease** and reconcile unused capacity upon completion.

---

## Mechanism & Lease Reconciliation

When five parallel workers check a shared balance of `10,000` remaining tokens without reservations, all five see `10,000` available and collectively burn `40,000` tokens. A **Token Budget Lease** solves concurrent over-allocation via two-phase reservation:

1. **Reserve (`TryAcquireLeaseAsync`):** Atomically deducts `EstimatedMaxTokens` with a short TTL (`120s`) before calling `IChatClient` ([[05 - Cloud FinOps for AI Workloads]]).
2. **Settle (`SettleLeaseAsync`):** Credits `EstimatedMaxTokens - ActualConsumedTokens` back to the tenant ledger once `ChatResponse.Usage` arrives, or expires cleanly if the worker crashes.

```csharp
namespace ArchVault.DotNet10.Concepts;

public sealed record TokenLeaseTicket(
    string LeaseId,
    string TenantId,
    int ReservedTokens,
    DateTimeOffset ExpiresAtUtc);

public interface ITokenLeaseCoordinator
{
    ValueTask<TokenLeaseTicket?> TryAcquireLeaseAsync(
        string tenantId,
        int estimatedMaxTokens,
        TimeSpan ttl,
        CancellationToken ct);

    ValueTask SettleLeaseAsync(
        TokenLeaseTicket ticket,
        int actualTokensUsed,
        CancellationToken ct);
}
```

> [!WARNING]
> **Anti-Pattern:** Relying exclusively on post-response `Counter<long>` metrics or cloud billing webhooks while allowing parallel `Task.WhenAll` agent branches to invoke frontier models unreserved.

---

## Lateral Graph Links

- **Concept Chain:** [[Concept 10 - Tenant Memory Isolation]] ↔ [[Concept 02 - Native AOT Kernel Wiring]] · [[Concept 05 - Tiered Semantic Caching]] · [[Concept 07 - Speculative Tool Execution]]
- **Applied In:** [[01 - .NET 10 Distributed Foundations]] · [[05 - Cloud FinOps for AI Workloads]] · [[08 - Future-Proofing the AI Stack]] · [[CLAUDE]]
- **Governance & Hubs:** [[00 - Home MOC]] · [[00 - Quick Start Guide]] · [[00 - Architecture Roadmap]] · [[Prompt 01 - System Architect]] · [[Template 01 - ADR Decision Record]] · [[Template 02 - Unit Economics Matrix]] · [[00 - Visual Blueprint.canvas]]
