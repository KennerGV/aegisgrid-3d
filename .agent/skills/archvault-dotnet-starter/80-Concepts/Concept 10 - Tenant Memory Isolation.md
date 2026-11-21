---
id: "concept-10"
title: "Concept 10 - Tenant Memory Isolation"
category: "80-Concepts"
type: zettelkasten-concept
tags:
  - zettelkasten
  - multi-tenancy
  - vector-security
  - zero-trust
created: 2026-11-14
---

# Concept 10 - Tenant Memory Isolation

**First-Principles Claim:** System-prompt instructions (*"Only answer using Tenant A's documents"*) provide **zero cryptographic isolation**; multi-tenant RAG and episodic agent memory must enforce a **non-nullable `TenantId` partition predicate at the repository adapter layer** derived strictly from the verified JWT principal—never from LLM-supplied tool arguments.

---

## Sealed Tenant Context Guard in C# 14

```csharp
namespace ArchVault.DotNet10.Concepts;

public readonly record struct VerifiedTenantScope
{
    public string TenantId { get; }

    public VerifiedTenantScope(string authenticatedTenantClaim)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(authenticatedTenantClaim);
        TenantId = authenticatedTenantClaim;
    }
}

public sealed record VectorMemoryChunk(string ChunkId, string TenantId, string Content, ReadOnlyMemory<float> Embedding);

public interface ITenantScopedVectorStore
{
    // Signature makes unpartitioned cross-tenant search unrepresentable at compile time
    Task<IReadOnlyList<VectorMemoryChunk>> SearchAsync(
        VerifiedTenantScope scope,
        ReadOnlyMemory<float> queryVector,
        int topK,
        CancellationToken ct);
}
```

---

## Lateral Graph Links

- **Concept Chain:** [[Concept 09 - Model Cascade Routing]] ↔ [[Concept 01 - Token Budget Leases]] · [[Concept 04 - Ephemeral Swarm Allocation]] · [[Concept 06 - GenAI Distributed Tracing]]
- **Applied In:** [[03 - Semantic Kernel Integration]] · [[07 - Scaling Multi-Agent Systems]] · [[CLAUDE]] · [[AGENTS]]
- **Governance & Hubs:** [[00 - Home MOC]] · [[00 - Architecture Roadmap]] · [[Prompt 04 - Verification Gate]] · [[Prompt 05 - Root Cause Debug]] · [[SOP 01 - Weekly Sprint Protocol]] · [[SOP 03 - Scale & Automation Gate]]
