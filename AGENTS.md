# AGENTS.md — AegisGrid 3D Architecture & Coding-Agent Contract

**AegisGrid 3D** is the flagship open-source live architecture digital twin for **[ArchVault](https://archvaults.dev)** (`https://archvaults.dev`). It pairs a compiler-gated, Native-AOT-compatible **`.NET 10` Minimal API** resilience engine with a locked-60-FPS **React Three Fiber (`THREE.InstancedMesh`)** isometric 3D control plane.

---

## 1. Vault Provenance & Licensing Scope

> [!IMPORTANT]
> **Bundled Starter Skill vs. Production Reference Implementations:**
> - **Bundled Locally (`$0` Free Starter):** Only the free **[Blueprint Starter .NET 10](https://whop.com/archvault-dev/)** Obsidian vault and coding-agent skill (`37` interconnected engineering notes) is bundled inside [`.agent/skills/archvault-dotnet-starter/`](.agent/skills/archvault-dotnet-starter/SKILL.md).
> - **Production Pattern Implementations:** The security and fault-tolerance subsystems inside `backend/AegisGrid.Api/` implement live executable patterns modeled on ArchVault's production engineering vaults (explored interactively at **[archvaults.dev/visor](https://archvaults.dev/visor)**):
>   1. **Enterprise MCP Server Gateway, OAuth 2.1 Delegation & OPA Tool Guardrails** → implemented in `Security/OpaPolicyEvaluator.cs`.
>   2. **Cryptographic Webhook Delivery, Adaptive Circuit Breakers & DLQ Replay** → implemented in `Security/HmacWebhookVerifier.cs`, `Resilience/ResiliencePipelineHost.cs`, and `Resilience/DlqRecoveryWorker.cs`.

Before modifying backend services, load [`.agent/skills/archvault-dotnet-starter/SKILL.md`](.agent/skills/archvault-dotnet-starter/SKILL.md), [`.agent/skills/archvault-dotnet-starter/CLAUDE.md`](.agent/skills/archvault-dotnet-starter/CLAUDE.md), and [`.agent/skills/archvault-dotnet-starter/00 - Home MOC.md`](.agent/skills/archvault-dotnet-starter/00%20-%20Home%20MOC.md).

---

## 2. System Topology

```text
[AI Agent Hub] ──► [OPA Policy Gate] ──► [API Gateway] ──► [Polly v8 Resilience Host] ──► [Downstream Worker Cluster]
                         │                                            │                           ▲
              (Blocks Poisoned MCP)                        (503 / Breaker OPEN)                   │ (HMAC Verified +
                         ▼                                            ▼                           │  Idempotent Replay)
               [Deflection Telemetry]                      [Bounded Channel DLQ] ─────────────────┘
```

| Layer | Directory | Core Stack | Architectural Responsibility |
| :--- | :--- | :--- | :--- |
| **Resilient Backend** | `backend/AegisGrid.Api/` | `.NET 10` (`net10.0`), Polly v8, `System.Threading.Channels`, `JsonSerializerContext` | Deterministic OPA MCP guardrails, constant-time HMAC-SHA256 verification, adaptive circuit breaking, bounded DLQ replay, and 150ms SSE telemetry streaming. |
| **3D WebGL Digital Twin** | `frontend/` | Vite, React, TypeScript, Tailwind CSS, Three.js, `@react-three/fiber`, `@react-three/postprocessing` | Isometric titanium/obsidian topology, `THREE.InstancedMesh` 60 FPS spline packet animation, selective Bloom shaders, chaos HUD, and offline simulation fallback. |
| **Agent Governance** | `.agent/skills/archvault-dotnet-starter/` | ArchVault Dual-Mode Skill | Progressive-disclosure `.NET 10` architectural invariants, AOT rules, and operational runbooks. |

---

## 3. Mandatory Compiler & Build Gates

Every change **MUST** pass both zero-warning release gates sequentially before completion:

### Gate 1 — `.NET 10` Release & Native-AOT Analyzer Gate
```bash
dotnet build backend/AegisGrid.Api/AegisGrid.Api.csproj -c Release -warnaserror
```
- Enforces `<TargetFramework>net10.0</TargetFramework>`, `<Nullable>enable</Nullable>`, `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`, and `<IsAotCompatible>true</IsAotCompatible>`.
- Zero `IL2026` (RequiresUnreferencedCode) or `IL3050` (RequiresDynamicCode) warnings permitted.

### Gate 2 — TypeScript & Production Bundle Gate
```bash
cd frontend && npm run build
```
- Enforces strict TypeScript typechecking (`tsc -b`) and clean Vite production bundling.

---

## 4. Non-Negotiable Engineering Invariants

1. **Zero Reflection Serialization:** All `.NET 10` JSON payloads and SSE frames must serialize exclusively via compile-time `JsonSerializerContext` (`AegisGridJsonContext`). Never invoke reflection-based `JsonSerializer.Serialize(object)`.
2. **Zero Unbounded Queues:** Never instantiate `Channel.CreateUnbounded<T>()` or fire-and-forget `Task.Run`. All dead-letter and ingestion buffers must use `Channel.CreateBounded<T>` with explicit `BoundedChannelFullMode` and `AllowSynchronousContinuations = false`.
3. **Constant-Time Cryptographic Verification:** Webhook and DLQ replay signatures must be verified with `HMACSHA256.HashData` and `CryptographicOperations.FixedTimeEquals`—never `==` or `SequenceEqual` on digest strings.
4. **Deterministic `TimeProvider` Injection:** Inject `TimeProvider` across resilience hosts, replay ledgers, and sliding telemetry windows rather than hardcoding `DateTime.UtcNow`.
5. **Integrated-GPU 60 FPS Budget:** All animated 3D packet streams (`nominal`, `attack`, `diverted`, `replay`) must render via `THREE.InstancedMesh` matrix updates inside `useFrame` with zero per-frame React state allocations or geometry instantiations.
