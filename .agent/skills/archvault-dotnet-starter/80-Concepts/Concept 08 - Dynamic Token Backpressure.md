---
id: "concept-08"
title: "Concept 08 - Dynamic Token Backpressure"
category: "80-Concepts"
type: zettelkasten-concept
tags:
  - zettelkasten
  - backpressure
  - rate-limiting
  - dotnet-10
created: 2026-11-14
---

# Concept 08 - Dynamic Token Backpressure

**First-Principles Claim:** Fixed requests-per-second rate limiters fail on LLM endpoints because a single `16,000`-token synthesis prompt consumes `80x` the quota of a `200`-token classification turn; pace outbound calls with `.NET 10`'s **`TokenBucketRateLimiter` weighted by estimated token count** and pause acquisition upon upstream `Retry-After` signals.

---

## Token-Weighted Acquisition in `System.Threading.RateLimiting`

Acquire `permitCount = estimatedTokens` before dispatching to `IChatClient` so bursty long-context requests smooth naturally instead of triggering regional `HTTP 429` cascades across [[07 - Scaling Multi-Agent Systems]]:

```csharp
using System.Threading.RateLimiting;

namespace ArchVault.DotNet10.Concepts;

public sealed class WeightedTokenGate : IAsyncDisposable
{
    private readonly TokenBucketRateLimiter _limiter;

    public WeightedTokenGate(int tokensPerMinuteCapacity = 240_000)
    {
        _limiter = new TokenBucketRateLimiter(new TokenBucketRateLimiterOptions
        {
            TokenLimit = tokensPerMinuteCapacity,
            TokensPerPeriod = tokensPerMinuteCapacity / 12,
            ReplenishmentPeriod = TimeSpan.FromSeconds(5),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 64,
            AutoReplenishment = true
        });
    }

    public async ValueTask<RateLimitLease> AcquireTokensAsync(int estimatedTokens, CancellationToken ct)
    {
        var bounded = Math.Clamp(estimatedTokens, 1, 32_000);
        return await _limiter.AcquireAsync(permitCount: bounded, ct);
    }

    public ValueTask DisposeAsync() => _limiter.DisposeAsync();
}
```

---

## Lateral Graph Links

- **Concept Chain:** [[Concept 07 - Speculative Tool Execution]] ↔ [[Concept 09 - Model Cascade Routing]] · [[Concept 02 - Native AOT Kernel Wiring]] · [[Concept 04 - Ephemeral Swarm Allocation]]
- **Applied In:** [[01 - .NET 10 Distributed Foundations]] · [[05 - Cloud FinOps for AI Workloads]] · [[07 - Scaling Multi-Agent Systems]] · [[08 - Future-Proofing the AI Stack]]
- **Governance & Hubs:** [[00 - Home MOC]] · [[00 - Architecture Roadmap]] · [[Prompt 02 - Quality Risk Auditor]] · [[Prompt 03 - Unit Economics CFO]] · [[Template 02 - Unit Economics Matrix]] · [[SOP 02 - Bottleneck Audit Matrix]]
