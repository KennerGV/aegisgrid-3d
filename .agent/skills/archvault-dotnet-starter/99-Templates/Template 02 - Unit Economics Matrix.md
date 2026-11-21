---
id: "template-02"
title: "Template 02 - Unit Economics Matrix"
category: "99-Templates"
type: template
tags:
  - finops
  - unit-economics
  - token-metering
  - ai-workloads
created: 2026-11-14
---

# Template 02 - AI Workload Unit Economics & FinOps Matrix

**Navigation:** [[00 - Home MOC]] | [[05 - Cloud FinOps for AI Workloads]] | [[Prompt 03 - Unit Economics CFO]] | [[Concept 01 - Token Budget Leases]]

> [!NOTE]
> **How to Use This Ledger:** Replace the baseline assumptions below with your provider's contracted per-1M-token rates and container vCPU-second pricing. Pair with [[05 - Cloud FinOps for AI Workloads]], [[Concept 05 - Tiered Semantic Caching]], and [[Concept 09 - Model Cascade Routing]].

---

## 1. Reference Workload Assumptions (B2B Multi-Step Triage Agent)

- **Prompt & Tool Turn Profile:** `3,000` input tokens + `500` output tokens per turn; `2.5` turns average (`5` turns hard cap).
- **Routing & Cache Profile:** `30%` L1/L2 cache hit (`0` LLM cost); remaining `70%` routed `80%` to Tier-1 SLM (`$0.15 / 1M` input, `$0.60 / 1M` output) and `20%` escalated to Tier-2 Frontier (`$2.50 / 1M` input, `$10.00 / 1M` output).
- **Blended LLM Cost per Uncached Workflow:** `$0.00775` (`7,750` micro-dollars = `80% × $0.001875` SLM + `20% × $0.03125` Frontier across `7,500` input + `1,250` output tokens); **Blended LLM Cost After `30%` Cache Hit:** `$0.005425` (`5,425` micro-dollars) per workflow.

---

## 2. Monthly Scale Cost & Gross Margin Matrix

| Monthly Completed Workflows | LLM Inference Spend | Compute + Broker + Redis + OTel | Total Monthly COGS | Blended Cost / 1K Workflows | Target B2B Usage Revenue (`USD 18 / 1K`) | Gross Margin |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`10,000` / mo** (Pilot) | `USD 54.25` | `USD 65.00` (scale-to-zero ACA + managed tiers) | **`USD 119.25`** | `USD 11.93` | `USD 180` | **`33.75%`** (fixed-base phase) |
| **`100,000` / mo** (Growth) | `USD 542.50` | `USD 165.00` (KEDA burst workers + Redis L2) | **`USD 707.50`** | `USD 7.08` | `USD 1,800` | **`60.69%`** |
| **`1,000,000` / mo** (Enterprise) | `USD 5,425.00` | `USD 940.00` (dedicated AKS/ACA pool + Kafka) | **`USD 6,365.00`** | `USD 6.37` | `USD 18,000` | **`64.64%`** |

---

## 3. Hard Circuit-Breaker Thresholds (Copy into `appsettings.Production.json`)

```json
{
  "AgentFinOps": {
    "MaxIterationsPerWorkflow": 5,
    "TenantDailyMicroDollarQuota": 25000000,
    "PerWorkflowTokenLeaseCap": 16000,
    "SemanticCacheCosineThreshold": 0.94,
    "FrontierEscalationConfidenceFloor": 0.82
  }
}
```

---

## Linked Vault References

- **FinOps Primitives:** [[Concept 01 - Token Budget Leases]] · [[Concept 04 - Ephemeral Swarm Allocation]] · [[Concept 05 - Tiered Semantic Caching]] · [[Concept 09 - Model Cascade Routing]]
- **Operational Governance:** [[05 - Cloud FinOps for AI Workloads]] · [[08 - Future-Proofing the AI Stack]] · [[Prompt 03 - Unit Economics CFO]] · [[Template 01 - ADR Decision Record]] · [[SOP 01 - Weekly Sprint Protocol]] · [[00 - Quick Start Guide]]
