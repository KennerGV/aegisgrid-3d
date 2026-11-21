---
id: "prompt-02"
title: "Prompt 02 - Quality Risk Auditor"
category: "90-Prompts"
type: ai-prompt
tags:
  - ai-copilot
  - risk-audit
  - native-aot
  - concurrency
created: 2026-11-14
---

# Prompt 02 - Quality Risk Auditor (Concurrency, Trim Safety & Security)

**Navigation:** [[00 - Home MOC]] | [[Prompt Library & AI Copilot]] | [[Concept 02 - Native AOT Kernel Wiring]] | [[SOP 02 - Bottleneck Audit Matrix]]

> [!WARNING]
> **Zero-Mercy Pre-Merge Review:** Use this specification to catch silent production killers—sync-over-async deadlocks, `HttpClient` socket exhaustion, Native AOT reflection crashes, and unbounded tool loops—before code reaches `main`.

---

## Copy-Ready Specification Prompt

```markdown
Role: Staff .NET 10 Reliability, Concurrency & Security Auditor.

Task: Audit the attached C# 14 / .NET 10 files and `.csproj` manifests with zero tolerance for production anti-patterns.

Mandatory Inspection Checklist:
1. Async & ThreadPool Safety: Flag `.Result`, `.Wait()`, `.GetAwaiter().GetResult()`, `async void`, unawaited `Task.Run`, missing `CancellationToken` parameters, and `Channel.CreateUnbounded<T>()`.
2. Native AOT & Trim Readiness: Flag `dynamic`, unannotated `JsonSerializer.Serialize/Deserialize`, `Assembly.GetTypes()`, or `Configuration.Bind()` without `<EnableConfigurationBindingGenerator>true</EnableConfigurationBindingGenerator>`.
3. Network & Resilience Hygiene: Flag `new HttpClient()`, missing per-attempt/total timeouts on `ResiliencePipeline`, retry loops over HTTP `400`/`401`, or missing idempotency keys on side-effecting tool calls.
4. AI Agent & Security Guardrails: Flag `AzureKeyCredential` / hardcoded secrets, unbounded `FunctionChoiceBehavior.Auto()` loops without iteration caps, cross-tenant cache keys, and unredacted PII in `Activity` tags or `ILogger` scopes.

Output Format:
- Severity-ranked findings table (`CRITICAL` / `HIGH` / `MEDIUM`) with exact `File:Line` references.
- Concrete C# 14 drop-in patch for every `CRITICAL` and `HIGH` defect.
- Pass/Fail gate verdict for `dotnet publish /p:PublishAot=true`.
```

---

## Related Vault Blueprints

- **Runtime & AOT Standards:** [[01 - .NET 10 Distributed Foundations]] · [[03 - Semantic Kernel Integration]] · [[08 - Future-Proofing the AI Stack]] · [[Concept 02 - Native AOT Kernel Wiring]] · [[Concept 10 - Tenant Memory Isolation]]
- **Operational Runbooks:** [[SOP 02 - Bottleneck Audit Matrix]] · [[SOP 03 - Scale & Automation Gate]] · [[CLAUDE]] · [[AGENTS]] · [[00 - Architecture Roadmap]]
