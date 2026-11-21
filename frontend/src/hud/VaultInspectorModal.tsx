import { ExternalLink, X, ShieldCheck, Cpu, Workflow, Sparkles, CheckCircle2 } from 'lucide-react';
import type { VaultBlueprintId } from '../types/telemetry';

interface VaultInspectorModalProps {
  open: boolean;
  activeId: VaultBlueprintId | null;
  onClose: () => void;
}

interface BlueprintMapping {
  id: VaultBlueprintId;
  moduleName: string;
  vaultTitle: string;
  tierBadge: string;
  tierStyle: string;
  summary: string;
  backendFiles: string[];
  invariants: string[];
  icon: typeof Cpu;
}

const BLUEPRINT_MAPPINGS: BlueprintMapping[] = [
  {
    id: 'dotnet-aot',
    moduleName: '.NET 10 Native AOT Core',
    vaultTitle: 'Blueprint Starter .NET 10',
    tierBadge: 'FREE $0 · BUNDLED IN .agent/skills/',
    tierStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
    summary:
      'Dual-mode 37-node Obsidian engineering vault and coding-agent skill governing zero-reflection JsonSerializerContext SSE streaming, bounded channels, and strict compiler-gated Native AOT builds.',
    backendFiles: [
      'backend/AegisGrid.Api/AegisGrid.Api.csproj',
      'backend/AegisGrid.Api/Serialization/AegisGridJsonContext.cs',
      '.agent/skills/archvault-dotnet-starter/SKILL.md',
    ],
    invariants: [
      '<IsAotCompatible>true</IsAotCompatible> & <TreatWarningsAsErrors>true</TreatWarningsAsErrors>',
      'Zero reflection UTF-8 JSON streaming every 150ms via source generation',
      'Deterministic TimeProvider injection across sliding p95 telemetry windows',
    ],
    icon: Cpu,
  },
  {
    id: 'opa-mcp',
    moduleName: 'OPA Policy Gate',
    vaultTitle: 'Enterprise MCP Server Gateway, OAuth 2.1 Delegation & OPA Tool Guardrails',
    tierBadge: 'PRODUCTION VAULT ARCHITECTURE',
    tierStyle: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
    summary:
      'Zero-trust perimeter guardrail inspecting Model Context Protocol tool invocations at wire speed—blocking destructive SQL/shell tools, cloud metadata SSRF, external exfiltration URLs, and missing OAuth 2.1 scopes.',
    backendFiles: [
      'backend/AegisGrid.Api/Security/OpaPolicyEvaluator.cs',
      'frontend/src/scene/OpaPolicyShield.tsx',
    ],
    invariants: [
      'Mandatory mcp:tools:invoke OAuth 2.1 scope validation & wildcard rejection',
      'Deterministic denylist blocking drop_table, 169.254.169.254 SSRF, and external C2 egress',
      'Zero-allocation Span<char> token parsing on hot ingress paths',
    ],
    icon: ShieldCheck,
  },
  {
    id: 'webhook-dlq',
    moduleName: 'Circuit Breaker & DLQ Recovery',
    vaultTitle: 'Cryptographic Webhook Delivery, Adaptive Circuit Breakers & DLQ Replay',
    tierBadge: 'PRODUCTION VAULT ARCHITECTURE',
    tierStyle: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40',
    summary:
      'Fault-isolating Polly v8 pipeline (FailureRatio = 0.5, BreakDuration = 10s) paired with constant-time HMAC-SHA256 envelope signing and bounded channel Dead-Letter Queue replay with atomic idempotency keys.',
    backendFiles: [
      'backend/AegisGrid.Api/Security/HmacWebhookVerifier.cs',
      'backend/AegisGrid.Api/Resilience/ResiliencePipelineHost.cs',
      'backend/AegisGrid.Api/Resilience/DlqRecoveryWorker.cs',
    ],
    invariants: [
      'CryptographicOperations.FixedTimeEquals HMAC-SHA256 verification + 5m skew guard',
      'Channel.CreateBounded<DeadLetterEnvelope>(2048) preventing heap exhaustion',
      'Atomic ConcurrentDictionary<string, DateTimeOffset> idempotency ledger on replay',
    ],
    icon: Workflow,
  },
];

export function VaultInspectorModal({ open, activeId, onClose }: VaultInspectorModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-[#0B0E15] border border-amber-400/30 shadow-[0_24px_80px_rgba(0,0,0,0.92)] p-6 sm:p-7 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-[11px] font-semibold tracking-wider text-amber-300 uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              ArchVault Live Blueprint Provenance
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-2.5">
              AegisGrid 3D — Governing Architecture Vaults
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Every 3D subsystem in this WebGL twin maps directly to compiler-verified{' '}
              <span className="text-slate-200 font-medium">.NET 10</span> production blueprints
              designed for Obsidian &amp; AI coding agents (Claude Code, Cursor, Copilot, Antigravity).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Module Blueprint Cards */}
        <div className="grid grid-cols-1 gap-4 my-5">
          {BLUEPRINT_MAPPINGS.map((item) => {
            const Icon = item.icon;
            const highlighted = activeId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-lg p-4 sm:p-5 border transition ${
                  highlighted
                    ? 'bg-[#131926] border-amber-400/75 shadow-[0_0_28px_rgba(245,158,11,0.16)]'
                    : 'bg-[#10141E]/90 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-mono-tech uppercase tracking-wider text-slate-400">
                        3D Module: <span className="text-slate-200 font-semibold">{item.moduleName}</span>
                      </div>
                      <h3 className="text-base font-bold text-white">{item.vaultTitle}</h3>
                    </div>
                  </div>
                  <span
                    className={`text-[10.5px] font-mono-tech font-bold px-2.5 py-1 rounded border ${item.tierStyle}`}
                  >
                    {item.tierBadge}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
                  {item.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3.5 pt-3 border-t border-white/[0.06]">
                  <div>
                    <div className="text-[10px] font-mono-tech uppercase tracking-wider text-slate-500 mb-1.5">
                      Enforced Invariants
                    </div>
                    <ul className="space-y-1">
                      {item.invariants.map((inv, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{inv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono-tech uppercase tracking-wider text-slate-500 mb-1.5">
                      Verified Workspace Implementation
                    </div>
                    <div className="flex flex-col gap-1">
                      {item.backendFiles.map((f) => (
                        <code
                          key={f}
                          className="font-mono-tech text-[11px] px-2 py-1 rounded bg-black/40 border border-white/[0.06] text-amber-200/90 whitespace-normal break-all leading-snug"
                        >
                          {f}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Direct Conversion CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="text-xs text-slate-400">
            Open <code className="text-amber-300 font-mono-tech">.agent/skills/archvault-dotnet-starter/</code>{' '}
            directly in Obsidian or explore the full production catalog online.
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="https://archvaults.dev/visor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-400/40 text-xs font-bold tracking-wider uppercase text-cyan-200 transition"
            >
              Interactive Graph Visor
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://whop.com/archvault-dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-xs font-extrabold tracking-wider uppercase text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.35)] transition"
            >
              Get Free $0 Starter &amp; Pro Vaults
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
