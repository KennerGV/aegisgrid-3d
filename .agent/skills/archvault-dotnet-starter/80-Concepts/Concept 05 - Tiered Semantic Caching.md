---
id: "concept-05"
title: "Concept 05 - Tiered Semantic Caching"
category: "80-Concepts"
type: zettelkasten-concept
tags:
  - zettelkasten
  - semantic-cache
  - hybridcache
  - vector-search
created: 2026-11-14
---

# Concept 05 - Tiered Semantic Caching

**First-Principles Claim:** Vector-similarity caching without **tenant key prefixing** and **intent temperature gating** risks serving stale or cross-tenant answers; combine sub-millisecond **L1/L2 exact SHA-256 `HybridCache` lookup** with a strict high-similarity (`cosine >= 0.94`) tenant-scoped vector tier exclusively on deterministic read intents.

---

## Two-Tier Lookup Hierarchy

1. **Tier 1 — Exact Canonical Hash (`HybridCache`):** Hashes `(TenantId, ModelId, SystemPromptVersion, NormalizedPrompt)` via `SHA256.HashData`—zero embedding API cost and zero false-positive risk ([[01 - .NET 10 Distributed Foundations]]).
2. **Tier 2 — Tenant-Isolated Vector Similarity:** Executed only on read-only FAQ/triage intents (`MutatingToolsAllowed == false`), partitioned strictly by `TenantId` ([[Concept 10 - Tenant Memory Isolation]]).

```csharp
using System.Security.Cryptography;
using System.Text;

namespace ArchVault.DotNet10.Concepts;

public static class CanonicalPromptCacheKey
{
    public static string BuildExactKey(string tenantId, string modelId, string promptVersion, string userText)
    {
        var canonical = $"{tenantId}|{modelId}|{promptVersion}|{userText.Trim()}";
        Span<byte> digest = stackalloc byte[32];
        SHA256.HashData(Encoding.UTF8.GetBytes(canonical), digest);
        return $"llm:exact:{tenantId}:{Convert.ToHexStringLower(digest[..16])}";
    }
}
```

---

## Lateral Graph Links

- **Concept Chain:** [[Concept 04 - Ephemeral Swarm Allocation]] ↔ [[Concept 06 - GenAI Distributed Tracing]] · [[Concept 01 - Token Budget Leases]] · [[Concept 09 - Model Cascade Routing]]
- **Applied In:** [[02 - Autonomous AI Agent Topologies]] · [[03 - Semantic Kernel Integration]] · [[05 - Cloud FinOps for AI Workloads]]
- **Governance & Hubs:** [[00 - Home MOC]] · [[00 - Architecture Roadmap]] · [[Prompt 05 - Root Cause Debug]] · [[Prompt Library & AI Copilot]] · [[Template 03 - Production Release Playbook]] · [[SOP 02 - Bottleneck Audit Matrix]]
