---
id: "prompt-04"
title: "Prompt 04 - Verification Gate"
category: "90-Prompts"
type: ai-prompt
tags:
  - ai-copilot
  - testing
  - testcontainers
  - verification
created: 2026-11-14
---

# Prompt 04 - Verification Gate (Deterministic xUnit v3 & Testcontainers Suite)

**Navigation:** [[00 - Home MOC]] | [[Prompt Library & AI Copilot]] | [[04 - Event-Driven AI Orchestration]] | [[SOP 03 - Scale & Automation Gate]]

> [!IMPORTANT]
> **Deterministic AI & Saga Testing:** Never depend on live external LLM endpoints in unit tests, and never mock PostgreSQL or Redis concurrency semantics when testing transactional outboxes or token leases.

---

## Copy-Ready Specification Prompt

```markdown
Role: Principal .NET 10 Test & Verification Engineer (`xUnit v3`, `Microsoft.Testing.Platform`, `Testcontainers`, `FakeTimeProvider`).

Task: Author a deterministic verification suite for the attached .NET 10 orchestrator, `IChatClient` middleware, and MassTransit consumer.

Mandatory Test Coverage:
1. Deterministic Time & Resilience Tests: Use `Microsoft.Extensions.Time.Testing.FakeTimeProvider` to verify Polly v8 timeout, circuit-breaker half-open recovery, and expired `TokenLeaseTicket` reclamation in milliseconds without `Task.Delay`.
2. Adversarial `IChatClient` Stubs: Simulate malformed JSON tool arguments, HTTP `429 Retry-After` storms, infinite tool-call loops, and mid-stream `OperationCanceledException` cancellation.
3. Ephemeral Infrastructure Integration (`Testcontainers`): Spin up real PostgreSQL + Redis containers to prove:
   - Five concurrent `TryAcquireLeaseAsync` calls never exceed the tenant's remaining token quota.
   - Duplicate broker redelivery of the same `(WorkflowId, StepIndex)` commits side effects exactly once via the EF Core outbox/inbox constraint.
4. Architecture Invariant Tests (`NetArchTest` / reflection-free assertions): Assert `Domain` and `Application` assemblies reference zero transport or vendor AI packages.

Deliver compilable C# 14 test classes with zero `Thread.Sleep` calls.
```

---

## Related Vault Blueprints

- **State & Concurrency Targets:** [[01 - .NET 10 Distributed Foundations]] · [[04 - Event-Driven AI Orchestration]] · [[Concept 03 - Event Sourced Agent State]] · [[Concept 04 - Ephemeral Swarm Allocation]] · [[Concept 07 - Speculative Tool Execution]]
- **CI/CD Enforcement:** [[SOP 03 - Scale & Automation Gate]] · [[Template 03 - Production Release Playbook]] · [[AGENTS]]
