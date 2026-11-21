---
id: "concept-03"
title: "Concept 03 - Event Sourced Agent State"
category: "80-Concepts"
type: zettelkasten-concept
tags:
  - zettelkasten
  - event-sourcing
  - agent-state
  - replay
created: 2026-11-14
---

# Concept 03 - Event Sourced Agent State

**First-Principles Claim:** Overwriting a single mutable `UPDATE agent_sessions SET state_json = ...` row destroys intermediate reasoning steps, tool arguments, and token deltas; persisting agent execution as an **append-only immutable event stream** unlocks deterministic crash recovery and CI regression replay.

---

## Deterministic Left-Fold Projection

Every state transition in [[04 - Event-Driven AI Orchestration]] appends a typed domain event (`ObjectiveSubmitted`, `ToolCallExecuted`, `BudgetAdjusted`, `WorkflowCompleted`). Rehydrating an interrupted workflow on a new worker pod is a pure left-fold (`Aggregate`) with zero side effects:

```csharp
namespace ArchVault.DotNet10.Concepts;

public abstract record AgentDomainEvent(Guid WorkflowId, int Sequence, DateTimeOffset OccurredAtUtc);

public sealed record ToolCallRecorded(
    Guid WorkflowId, int Sequence, DateTimeOffset OccurredAtUtc,
    string ToolName, string OutputSummary, int TokensSpent)
    : AgentDomainEvent(WorkflowId, Sequence, OccurredAtUtc);

public sealed record WorkflowProjection(Guid WorkflowId, int LastSequence, int TotalTokens, IReadOnlyList<string> CompletedTools)
{
    public static WorkflowProjection Replay(Guid id, IEnumerable<AgentDomainEvent> history)
    {
        var tools = new List<string>();
        int seq = 0, tokens = 0;
        foreach (var evt in history.OrderBy(e => e.Sequence))
        {
            seq = evt.Sequence;
            if (evt is ToolCallRecorded tc)
            {
                tokens += tc.TokensSpent;
                tools.Add(tc.ToolName);
            }
        }
        return new WorkflowProjection(id, seq, tokens, tools);
    }
}
```

---

## Lateral Graph Links

- **Concept Chain:** [[Concept 02 - Native AOT Kernel Wiring]] ↔ [[Concept 04 - Ephemeral Swarm Allocation]] · [[Concept 07 - Speculative Tool Execution]] · [[Concept 09 - Model Cascade Routing]]
- **Applied In:** [[03 - Semantic Kernel Integration]] · [[04 - Event-Driven AI Orchestration]] · [[06 - Observability & Telemetry]]
- **Governance & Hubs:** [[00 - Home MOC]] · [[00 - Architecture Roadmap]] · [[Prompt 03 - Unit Economics CFO]] · [[Prompt Library & AI Copilot]] · [[Template 03 - Production Release Playbook]] · [[SOP 03 - Scale & Automation Gate]] · [[00 - Visual Blueprint.canvas]]
