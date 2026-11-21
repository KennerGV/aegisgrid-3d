---
id: "prompt-03"
title: "Prompt 03 - Unit Economics CFO"
category: "90-Prompts"
type: ai-prompt
tags:
  - ai-copilot
  - finops
  - unit-economics
  - token-budgets
created: 2026-11-14
---

# Prompt 03 - Unit Economics CFO (AI Workload Margin & Token Stress-Test)

**Navigation:** [[00 - Home MOC]] | [[Prompt Library & AI Copilot]] | [[05 - Cloud FinOps for AI Workloads]] | [[Template 02 - Unit Economics Matrix]]

> [!TIP]
> **Prevent Margin Inversion:** Multi-step agent loops multiply input context tokens on every tool turn. Run this prompt whenever adding new tools, increasing context windows, or pricing an AI-backed B2B tier.

---

## Copy-Ready Specification Prompt

```markdown
Role: Principal Cloud & AI FinOps Architect.

Task: Stress-test the unit economics of our .NET 10 agentic workload across 10,000, 100,000, and 1,000,000 monthly workflows.

Workload Inputs:
- Average System + RAG Context Tokens per Turn: [e.g., 2,800 input / 450 output]
- Average Tool-Calling Turns per Workflow (p50 / p95 / max cap): [e.g., 2 / 4 / 5]
- Model Routing Mix: [e.g., 75% Tier-1 SLM ($0.15/1M in, $0.60/1M out) + 25% Tier-2 Frontier ($2.50/1M in, $10.00/1M out)]
- L1/L2 Semantic Cache Hit Ratio: [e.g., 30%]
- Compute, Broker, Redis & Vector DB Monthly Baseline + Elastic Cost: [SPECIFY INFRA]
- Tenant Subscription or Usage Revenue per 1,000 Workflows: [SPECIFY PRICING]

Required Analysis:
1. Exact per-workflow cost breakdown (LLM tokens, embeddings, ACA/AKS compute, Service Bus/Kafka, telemetry ingestion) at p50 and p95 retry/escalation rates.
2. Worst-case monthly tenant burn if every request hits the `MaxIterations` cap at 0% cache hit—and the exact `TokenBudgetLease` ceiling required to cap gross margin above 75%.
3. Ranked architectural optimizations (`HybridCache` canonical hashing, SLM cascade threshold tuning, prompt prefix caching) quantified in USD saved per 100K workflows.
```

---

## Related Vault Blueprints

- **FinOps & Routing Architecture:** [[05 - Cloud FinOps for AI Workloads]] · [[08 - Future-Proofing the AI Stack]] · [[Concept 01 - Token Budget Leases]] · [[Concept 05 - Tiered Semantic Caching]] · [[Concept 09 - Model Cascade Routing]]
- **Financial Ledger & Cadence:** [[Template 02 - Unit Economics Matrix]] · [[SOP 01 - Weekly Sprint Protocol]] · [[00 - Architecture Roadmap]]
