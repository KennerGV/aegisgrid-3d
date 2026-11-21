---
id: "concept-09"
title: "Concept 09 - Model Cascade Routing"
category: "80-Concepts"
type: zettelkasten-concept
tags:
  - zettelkasten
  - model-routing
  - slm
  - finops
created: 2026-11-14
---

# Concept 09 - Model Cascade Routing

**First-Principles Claim:** Routing routine schema extraction, triage classification, and log summarization through a frontier reasoning model wastes both latency budget and token spend; evaluate **Tier-1 Small Language Models (SLMs)** first with structured confidence output, escalating to **Tier-2 Frontier Models** only when confidence falls below threshold or complex multi-tool planning is required.

---

## Deterministic Confidence Escalation Gate

```csharp
using Microsoft.Extensions.AI;

namespace ArchVault.DotNet10.Concepts;

public sealed record SlmTriageAttempt(string Category, double Confidence, string DraftAnswer);

public sealed class CascadeModelRouter(IChatClient fastSlm, IChatClient frontierModel)
{
    public async Task<ChatResponse> RouteWithConfidenceGateAsync(
        IList<ChatMessage> messages,
        Func<string, SlmTriageAttempt?> tryParseSlmOutput,
        double confidenceFloor,
        CancellationToken ct)
    {
        var slmResponse = await fastSlm.GetResponseAsync(messages, cancellationToken: ct);
        if (tryParseSlmOutput(slmResponse.Text) is { } parsed && parsed.Confidence >= confidenceFloor)
        {
            return slmResponse;
        }

        // Escalate ambiguous or multi-hop reasoning tasks to Tier-2 Frontier Model
        return await frontierModel.GetResponseAsync(messages, cancellationToken: ct);
    }
}
```

---

## Lateral Graph Links

- **Concept Chain:** [[Concept 08 - Dynamic Token Backpressure]] ↔ [[Concept 10 - Tenant Memory Isolation]] · [[Concept 03 - Event Sourced Agent State]] · [[Concept 05 - Tiered Semantic Caching]]
- **Applied In:** [[05 - Cloud FinOps for AI Workloads]] · [[06 - Observability & Telemetry]] · [[08 - Future-Proofing the AI Stack]]
- **Governance & Hubs:** [[00 - Home MOC]] · [[00 - Architecture Roadmap]] · [[Prompt 03 - Unit Economics CFO]] · [[Prompt 04 - Verification Gate]] · [[Template 02 - Unit Economics Matrix]] · [[Template 03 - Production Release Playbook]]
