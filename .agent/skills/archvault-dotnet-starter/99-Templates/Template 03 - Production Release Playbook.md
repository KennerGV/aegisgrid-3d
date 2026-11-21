---
id: "template-03"
title: "Template 03 - Production Release Playbook"
category: "99-Templates"
type: template
tags:
  - directory-build-props
  - dotnet-aspire
  - native-aot
  - release-playbook
created: 2026-11-14
---

# Template 03 - Production Release Playbook (`Directory.Build.props` & `.NET Aspire`)

**Navigation:** [[00 - Home MOC]] | [[00 - Quick Start Guide]] | [[01 - .NET 10 Distributed Foundations]] | [[SOP 03 - Scale & Automation Gate]]

---

## 1. Copy-Ready Solution Root `Directory.Build.props` (`net10.0` + AOT Analyzer Gate)

Drop this file into the root of your `.NET 10` repository to enforce strict nullability, deterministic builds, trim/AOT analyzers, and compile-time configuration binding across every project:

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>14.0</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <Deterministic>true</Deterministic>
    <ContinuousIntegrationBuild Condition="'$(CI)' == 'true'">true</ContinuousIntegrationBuild>

    <!-- Enforce Native AOT & ILLink trim safety during regular builds -->
    <IsAotCompatible>true</IsAotCompatible>
    <EnableTrimAnalyzer>true</EnableTrimAnalyzer>
    <EnableSingleFileAnalyzer>true</EnableSingleFileAnalyzer>
    <EnableConfigurationBindingGenerator>true</EnableConfigurationBindingGenerator>
    <EnableRequestDelegateGenerator>true</EnableRequestDelegateGenerator>
  </PropertyGroup>
</Project>
```

---

## 2. Copy-Ready `.NET Aspire` `AppHost.cs` Topology

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("pg").WithPgAdmin().AddDatabase("agentstate");
var redis = builder.AddRedis("cache");
var messaging = builder.AddAzureServiceBus("bus");

var worker = builder.AddProject<Projects.ArchVault_AgentWorker>("agent-worker")
    .WithReference(postgres)
    .WithReference(redis)
    .WithReference(messaging)
    .WaitFor(postgres)
    .WaitFor(redis);

builder.AddProject<Projects.ArchVault_Api>("gateway-api")
    .WithExternalHttpEndpoints()
    .WithReference(redis)
    .WithReference(messaging)
    .WaitFor(worker);

builder.Build().Run();
```

---

## 3. Progressive Canary Rollout Checklist

- [ ] **T-30m Pre-Flight:** `dotnet test` + Native AOT publish gate green in [[SOP 03 - Scale & Automation Gate]]; zero `AzureKeyCredential` secrets (`DefaultAzureCredential` Workload Identity verified).
- [ ] **Stage 1 (`5%` Canary Weight — 15 min):** Inspect `gen_ai.client.operation.duration` p99, `finops.workflow.spend.micros`, and dead-letter count in [[06 - Observability & Telemetry]].
- [ ] **Stage 2 (`25% -> 100%` Promotion):** Confirm KEDA replica scale-out/scale-in honors `HostOptions.ShutdownTimeout` (`45s`, paired with `terminationGracePeriodSeconds: 60`) under [[07 - Scaling Multi-Agent Systems]] and [[Prompt 06 - Production Readiness & Chaos Review]].
- [ ] **Instant Rollback Trigger:** Shift traffic revision weight back to `100%` previous stable digest if HTTP `5xx > 1%`, DLQ count `> 5 messages / 1,000 turns`, or per-workflow token spend exceeds `1.5x` baseline.

---

## Linked Vault References

- **Core Architecture:** [[01 - .NET 10 Distributed Foundations]] · [[03 - Semantic Kernel Integration]] · [[04 - Event-Driven AI Orchestration]] · [[07 - Scaling Multi-Agent Systems]] · [[08 - Future-Proofing the AI Stack]]
- **Concepts & Contracts:** [[Concept 02 - Native AOT Kernel Wiring]] · [[Concept 03 - Event Sourced Agent State]] · [[CLAUDE]] · [[AGENTS]] · [[00 - Visual Blueprint.canvas]]
