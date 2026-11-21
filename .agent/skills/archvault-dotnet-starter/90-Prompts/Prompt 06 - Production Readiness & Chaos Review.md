---
id: "prompt-06"
title: "Prompt 06 - Production Readiness & Chaos Review"
category: "90-Prompts"
type: ai-prompt
tags:
  - ai-copilot
  - sre
  - chaos-engineering
  - keda
created: 2026-11-14
---

# Prompt 06 - Production Readiness & Chaos Review (ORR & Fault Injection)

**Navigation:** [[00 - Home MOC]] | [[Prompt Library & AI Copilot]] | [[07 - Scaling Multi-Agent Systems]] | [[Template 03 - Production Release Playbook]]

> [!IMPORTANT]
> **Operational Readiness Review (ORR):** Run this gate before promoting any new multi-agent `.NET 10` service to production traffic or raising KEDA `maxReplicaCount`.

---

## Copy-Ready Specification Prompt

```markdown
Role: Principal Site Reliability Engineer (SRE) & Chaos Engineering Lead for Distributed .NET 10 + Kubernetes/ACA.

Target System Artifacts:
- Deployment / KEDA Manifests & `HostOptions`: [PASTE YAML / PROGRAM.CS]
- Resilience & Rate-Limiting Policies: [PASTE POLLY / RATE LIMITER CONFIG]
- Health Probes & Shutdown Hooks: [PASTE `/health/live`, `/health/ready`, `SIGTERM` DRAIN]

Operational Readiness & Chaos Audit:
1. Graceful Drain Audit: Verify `terminationGracePeriodSeconds` exceeds `HostOptions.ShutdownTimeout` + worst-case single agent turn timeout so KEDA scale-in never truncates active `Outbox` commits or `TokenLease` settlements.
2. Fault-Injection Scenarios: Predict exact system behavior and blast radius when:
   - Primary Azure OpenAI region returns 100% HTTP `429`/`503` for 180 seconds.
   - Redis L2 cache / lease store experiences a 30-second network partition.
   - A single enterprise tenant enqueues 50,000 jobs in 60 seconds (noisy-neighbor fairness).
3. Go / No-Go Verdict: Output a strict ORR sign-off table (`PASS` / `BLOCKER`) with exact remediation patches for every blocker.
```

---

## Related Vault Blueprints

- **Elastic Scale & Failover:** [[07 - Scaling Multi-Agent Systems]] · [[08 - Future-Proofing the AI Stack]] · [[Concept 08 - Dynamic Token Backpressure]] · [[Concept 09 - Model Cascade Routing]] · [[Concept 10 - Tenant Memory Isolation]]
- **Release & CI Gates:** [[Template 03 - Production Release Playbook]] · [[SOP 01 - Weekly Sprint Protocol]] · [[SOP 03 - Scale & Automation Gate]] · [[AGENTS]]
