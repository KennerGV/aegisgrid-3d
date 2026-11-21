---
id: "concept-02"
title: "Concept 02 - Native AOT Kernel Wiring"
category: "80-Concepts"
type: zettelkasten-concept
tags:
  - zettelkasten
  - native-aot
  - source-generators
  - dotnet-10
created: 2026-11-14
---

# Concept 02 - Native AOT Kernel Wiring

**First-Principles Claim:** Scale-to-zero agent workers spun up by KEDA bursts ([[07 - Scaling Multi-Agent Systems]]) cannot afford JIT warmup spikes or runtime reflection crashes; wiring plugins, configuration, and JSON schemas through **C# compile-time source generators** makes `.NET 10` agent binaries 100% trim- and Native-AOT-safe.

---

## Compile-Time Metadata vs Runtime Reflection

Reflection-based serialization (`JsonSerializer.Serialize(obj)`) and `ConfigurationBinder.Bind` inspect types dynamically at runtime, breaking when the ILLink trimmer strips unreferenced metadata (`IL2026` / `IL3050`). Replace all three reflection surfaces at compile time:

```csharp
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace ArchVault.DotNet10.Concepts;

public sealed class AgentWorkerOptions
{
    [Required]
    public required string ServiceBusNamespace { get; init; }

    [Range(1, 256)]
    public int MaxConcurrentTurns { get; init; } = 16;
}

// 1. Compile-time Options validation (zero runtime reflection)
[OptionsValidator]
public sealed partial class AgentWorkerOptionsValidator : IValidateOptions<AgentWorkerOptions>;

// 2. Compile-time JSON schema & UTF-8 serializer generation for AI tool arguments
public sealed record TriageToolArgs(string Namespace, string PodName, int TailLines);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.SnakeCaseLower)]
[JsonSerializable(typeof(TriageToolArgs))]
public sealed partial class AgentToolJsonContext : JsonSerializerContext;
```

---

## Lateral Graph Links

- **Concept Chain:** [[Concept 01 - Token Budget Leases]] ↔ [[Concept 03 - Event Sourced Agent State]] · [[Concept 06 - GenAI Distributed Tracing]] · [[Concept 08 - Dynamic Token Backpressure]]
- **Applied In:** [[01 - .NET 10 Distributed Foundations]] · [[02 - Autonomous AI Agent Topologies]] · [[03 - Semantic Kernel Integration]] · [[CLAUDE]]
- **Governance & Hubs:** [[00 - Home MOC]] · [[00 - Quick Start Guide]] · [[00 - Architecture Roadmap]] · [[Prompt 02 - Quality Risk Auditor]] · [[Template 03 - Production Release Playbook]] · [[SOP 02 - Bottleneck Audit Matrix]] · [[00 - Visual Blueprint.canvas]]
