import { useMemo } from 'react';
import {
  Layers,
  RotateCcw,
  Orbit,
  RefreshCw,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import type {
  ConnectionMode,
  SparklineSample,
  TelemetryFrame,
} from '../types/telemetry';

interface ControlHudProps {
  frame: TelemetryFrame;
  mode: ConnectionMode;
  sparkline: SparklineSample[];
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onResetCamera: () => void;
  onToggleMcpAttack: () => void;
  onToggleInjectFailure: () => void;
  onReplayDlq: () => void;
  onOpenVaultModal: () => void;
}

function RadialDial({
  label,
  pct,
  accent = '#F59E0B',
}: {
  label: string;
  pct: number;
  accent?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  // Sweep from -135 deg to +135 deg (270 deg total)
  const angleDeg = -135 + (clamped / 100) * 270;
  const r = 17;
  const circumference = 2 * Math.PI * r;
  const arcLen = circumference * 0.75;
  const filledLen = arcLen * (clamped / 100);

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative w-11 h-11 flex items-center justify-center rounded-full bg-[#090C12] border border-white/10 shadow-inner">
        <svg viewBox="0 0 44 44" className="w-11 h-11 overflow-visible">
          <circle
            cx="22"
            cy="22"
            r={r}
            fill="none"
            stroke="rgba(148,163,184,0.16)"
            strokeWidth="2.6"
            strokeDasharray={`${arcLen} ${circumference}`}
            transform="rotate(135 22 22)"
            strokeLinecap="round"
          />
          <circle
            cx="22"
            cy="22"
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth="2.6"
            strokeDasharray={`${filledLen} ${circumference}`}
            transform="rotate(135 22 22)"
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 160ms ease-out' }}
          />
          {/* Needle */}
          <g
            transform={`rotate(${angleDeg} 22 22)`}
            style={{ transition: 'transform 160ms ease-out' }}
          >
            <line
              x1="22"
              y1="23"
              x2="22"
              y2="9"
              stroke={accent}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="22" cy="22" r="2.4" fill="#E2E8F0" />
          </g>
        </svg>
      </div>
      <span className="text-[8.5px] font-mono-tech tracking-widest text-slate-500 mt-0.5 uppercase">
        {label}
      </span>
    </div>
  );
}

function TelemetrySparkline({ samples }: { samples: SparklineSample[] }) {
  const { rpsArea, rpsLine, stressLine } = useMemo(() => {
    const w = 280;
    const h = 44;
    if (samples.length < 2) {
      return { rpsArea: '', rpsLine: '', stressLine: '' };
    }

    const rpsCoords: string[] = [];
    const stressCoords: string[] = [];

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]!;
      const x = (i / (samples.length - 1)) * w;

      const normRps = Math.min(1, Math.max(0.08, (s.rps - 80) / 210));
      const spikeBoost = Math.min(0.45, s.blocked / 420 + (s.latencyMs > 40 ? 0.25 : 0));
      const y = h - Math.min(h - 4, (normRps * 0.62 + spikeBoost) * (h - 6)) - 2;
      rpsCoords.push(`${x.toFixed(1)},${y.toFixed(1)}`);

      const stressVal = Math.min(1, s.blocked / 260 + Math.max(0, s.latencyMs - 16) / 320);
      const sy = h - stressVal * (h - 8) - 2;
      stressCoords.push(`${x.toFixed(1)},${sy.toFixed(1)}`);
    }

    const line = rpsCoords.join(' ');
    const area = `0,${h} ${line} ${w},${h}`;
    return { rpsArea: area, rpsLine: line, stressLine: stressCoords.join(' ') };
  }, [samples]);

  return (
    <div className="relative flex-1 min-w-[180px] max-w-[330px] h-[54px] px-2.5 py-1.5 rounded bg-[#080B10]/90 border border-white/[0.07] overflow-hidden">
      {/* Reticle corner brackets */}
      <span className="absolute top-1 left-1 w-2 h-2 border-t border-l border-slate-500/50" />
      <span className="absolute top-1 right-1 w-2 h-2 border-t border-r border-slate-500/50" />
      <span className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-slate-500/50" />
      <span className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-slate-500/50" />

      <svg viewBox="0 0 280 44" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="sparkAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1="0" y1="22" x2="280" y2="22" stroke="rgba(148,163,184,0.09)" strokeDasharray="3 3" />
        {rpsArea && <polygon points={rpsArea} fill="url(#sparkAreaGrad)" />}
        {rpsLine && (
          <polyline
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="1.4"
            strokeLinejoin="round"
            points={rpsLine}
          />
        )}
        {stressLine && (
          <polyline
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.15"
            strokeOpacity="0.75"
            strokeLinejoin="round"
            points={stressLine}
          />
        )}
      </svg>
    </div>
  );
}

export function ControlHud({
  frame,
  mode,
  sparkline,
  autoRotate,
  onToggleAutoRotate,
  onResetCamera,
  onToggleMcpAttack,
  onToggleInjectFailure,
  onReplayDlq,
  onOpenVaultModal,
}: ControlHudProps) {
  const latencyRounded = Math.round(frame.p95LatencyMs);
  const latencyElevated = frame.p95LatencyMs > 35;

  const breakerDisplay =
    frame.circuitState === 'OPEN'
      ? {
          text: 'OPEN (AMBER)',
          accentBar: 'bg-amber-500 shadow-[0_0_10px_#F59E0B]',
          textColor: 'text-amber-400',
          panelTint: 'border-amber-500/35 bg-amber-950/20',
        }
      : frame.circuitState === 'HALF_OPEN'
        ? {
            text: 'HALF-OPEN',
            accentBar: 'bg-yellow-400 shadow-[0_0_10px_#FACC15]',
            textColor: 'text-yellow-300',
            panelTint: 'border-yellow-500/30 bg-yellow-950/15',
          }
        : {
            text: 'CLOSED',
            accentBar: 'bg-emerald-400 shadow-[0_0_8px_#34D399]',
            textColor: 'text-emerald-400',
            panelTint: 'border-white/[0.07]',
          };

  const dlqDisplay =
    frame.dlqIngestStatus === 'REPLAYING'
      ? {
          text: `REPLAY (${frame.dlqDepth})`,
          accentBar: 'bg-cyan-300 shadow-[0_0_12px_#22D3EE]',
          textColor: 'text-cyan-300',
          panelTint: 'border-cyan-400/45 bg-cyan-950/25',
        }
      : frame.dlqIngestStatus === 'ACTIVE'
        ? {
            text: frame.dlqDepth > 0 ? `ACTIVE · ${frame.dlqDepth}` : 'ACTIVE',
            accentBar: 'bg-cyan-400 shadow-[0_0_10px_#06B6D4]',
            textColor: 'text-cyan-400',
            panelTint: 'border-cyan-500/30 bg-cyan-950/20',
          }
        : {
            text: 'STANDBY',
            accentBar: 'bg-cyan-500/70',
            textColor: 'text-cyan-400/90',
            panelTint: 'border-white/[0.07]',
          };

  const rpsDialPct = Math.round(((frame.requestsPerSec - 80) / 190) * 100);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-4">
      {/* Top Bar: Connection Telemetry Pill & Live Security Intercept Toast */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto hud-glass px-3 py-1.5 rounded-md flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 font-mono-tech font-semibold tracking-wider">
            <Radio
              className={`w-3.5 h-3.5 ${
                mode === 'LIVE_SSE'
                  ? 'text-emerald-400 animate-pulse'
                  : 'text-amber-400'
              }`}
            />
            <span className={mode === 'LIVE_SSE' ? 'text-emerald-300' : 'text-amber-300'}>
              {mode === 'LIVE_SSE' ? '.NET 10 SSE LIVE' : 'LOCAL SIMULATOR'}
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono-tech text-slate-300">
            {frame.requestsPerSec} <span className="text-slate-500">req/s</span>
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline font-mono-tech text-slate-400">
            HMAC OK: <span className="text-slate-200">{frame.hmacVerifiedCount.toLocaleString()}</span>
          </span>
        </div>

        {frame.mcpAttackActive && frame.lastSecurityEvent && (
          <div className="pointer-events-auto hud-glass border-amber-500/50 bg-[#221008]/90 px-3 py-1.5 rounded-md flex items-center gap-2 text-[11px] max-w-xl animate-pulse">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-mono-tech text-amber-200 truncate">
              {frame.lastSecurityEvent}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Control Deck matching docs/aegisgrid-mockup.jpg */}
      <div className="flex flex-col gap-2.5">
        {/* Upper Floating Row: Left Utility Buttons + Right Chaos & DLQ Controls */}
        <div className="flex items-end justify-between gap-3">
          {/* 3 Square Utility Controls (Left above HUD bar) */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenVaultModal}
              title="Inspect Governing ArchVault Blueprints"
              className="hud-glass w-9 h-9 rounded flex items-center justify-center text-slate-300 hover:text-amber-300 hover:border-amber-400/50 transition cursor-pointer"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleAutoRotate}
              title="Toggle Cinematic Orbit"
              className={`hud-glass w-9 h-9 rounded flex items-center justify-center transition cursor-pointer ${
                autoRotate
                  ? 'text-amber-400 border-amber-400/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Orbit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onResetCamera}
              title="Reset Isometric Camera Angle"
              className="hud-glass w-9 h-9 rounded flex items-center justify-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Right Chaos Toggles + Replay DLQ Trigger */}
          <div className="pointer-events-auto flex flex-col items-stretch gap-1.5 min-w-[238px]">
            {/* SIMULATE MCP ATTACK toggle */}
            <button
              type="button"
              onClick={onToggleMcpAttack}
              className={`hud-glass px-3.5 py-2 rounded-md flex items-center justify-between gap-4 transition cursor-pointer ${
                frame.mcpAttackActive
                  ? 'border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.22)]'
                  : 'hover:border-white/20'
              }`}
            >
              <span className="text-[11px] font-bold tracking-[0.12em] text-slate-100">
                SIMULATE MCP ATTACK
              </span>
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  frame.mcpAttackActive
                    ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                    : 'bg-slate-800 border border-slate-600/70'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    frame.mcpAttackActive ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>

            {/* INJECT FAILURE toggle */}
            <button
              type="button"
              onClick={onToggleInjectFailure}
              className={`hud-glass px-3.5 py-2 rounded-md flex items-center justify-between gap-4 transition cursor-pointer ${
                frame.failureInjected
                  ? 'border-amber-500/70 shadow-[0_0_20px_rgba(234,88,12,0.25)]'
                  : 'hover:border-white/20'
              }`}
            >
              <span className="text-[11px] font-bold tracking-[0.12em] text-slate-100">
                INJECT FAILURE
              </span>
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  frame.failureInjected
                    ? 'bg-gradient-to-r from-orange-600 to-amber-400'
                    : 'bg-slate-800 border border-slate-600/70'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    frame.failureInjected ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>

            {/* REPLAY DLQ Trigger */}
            <button
              type="button"
              onClick={onReplayDlq}
              className={`hud-glass px-3.5 py-1.5 rounded-md flex items-center justify-between gap-3 transition cursor-pointer ${
                frame.replayActive
                  ? 'border-cyan-300/85 bg-cyan-950/40 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                  : frame.dlqDepth > 0
                    ? 'border-cyan-400/65 hover:border-cyan-300 text-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.2)]'
                    : 'text-slate-400 hover:text-cyan-200 hover:border-cyan-500/40'
              }`}
            >
              <span className="flex items-center gap-2 text-[10.5px] font-bold tracking-[0.13em]">
                <RefreshCw
                  className={`w-3.5 h-3.5 text-cyan-400 ${frame.replayActive ? 'animate-spin' : ''}`}
                />
                REPLAY DLQ
              </span>
              <span className="font-mono-tech text-[10.5px] px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                {frame.dlqDepth} queued
              </span>
            </button>
          </div>
        </div>

        {/* Main Full-Width Dark Glassmorphic Telemetry Bar */}
        <div className="pointer-events-auto hud-glass rounded-lg px-3 py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5">
          {/* Far-Left: 3 Analog Radial Dials matching mockup */}
          <div className="hidden xl:flex items-center gap-2.5 pr-2 border-r border-white/[0.07]">
            <RadialDial label="RPS" pct={rpsDialPct} accent="#F59E0B" />
            <RadialDial label="CPU" pct={frame.cpuLoadPct} accent="#FBBF24" />
            <RadialDial label="DLQ" pct={frame.channelLoadPct} accent="#06B6D4" />
          </div>

          {/* Metric 1: P95 LATENCY */}
          <div className="hud-subpanel rounded px-3 py-1.5 min-w-[126px] flex items-center gap-2.5">
            <div
              className={`w-1 h-8 rounded-full ${
                latencyElevated
                  ? 'bg-amber-400 shadow-[0_0_8px_#F59E0B]'
                  : 'bg-cyan-400 shadow-[0_0_8px_#06B6D4]'
              }`}
            />
            <div>
              <div className="text-[9.5px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                P95 LATENCY:
              </div>
              <div
                className={`font-mono-tech text-lg font-bold leading-tight ${
                  latencyElevated ? 'text-amber-300' : 'text-slate-100'
                }`}
              >
                {latencyRounded}ms
              </div>
            </div>
          </div>

          {/* Metric 2: OPA BLOCKED/M */}
          <div className="hud-subpanel rounded px-3 py-1.5 min-w-[136px] flex items-center gap-2.5">
            <div className="w-1 h-8 rounded-full bg-red-500 shadow-[0_0_8px_#EF4444]" />
            <div>
              <div className="text-[9.5px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                OPA BLOCKED/M:
              </div>
              <div className="font-mono-tech text-lg font-bold leading-tight text-red-400">
                {frame.opaBlockedPerMin}/m
              </div>
            </div>
          </div>

          {/* Center: Live Sparkline Chart */}
          <TelemetrySparkline samples={sparkline} />

          {/* Metric 3: CIRCUIT BREAKER */}
          <div
            className={`hud-subpanel rounded px-3 py-1.5 min-w-[158px] flex items-center gap-2.5 ${breakerDisplay.panelTint}`}
          >
            <div className={`w-1 h-8 rounded-full ${breakerDisplay.accentBar}`} />
            <div>
              <div className="text-[9.5px] font-semibold tracking-[0.12em] text-slate-300 uppercase">
                CIRCUIT BREAKER:
              </div>
              <div className={`font-mono-tech text-sm font-extrabold leading-tight mt-0.5 ${breakerDisplay.textColor}`}>
                {breakerDisplay.text}
              </div>
            </div>
          </div>

          {/* Metric 4: DLQ INGEST */}
          <div
            className={`hud-subpanel rounded px-3 py-1.5 min-w-[138px] flex items-center gap-2.5 ${dlqDisplay.panelTint}`}
          >
            <div className={`w-1 h-8 rounded-full ${dlqDisplay.accentBar}`} />
            <div>
              <div className="text-[9.5px] font-semibold tracking-[0.12em] text-slate-300 uppercase">
                DLQ INGEST:
              </div>
              <div className={`font-mono-tech text-sm font-extrabold leading-tight mt-0.5 ${dlqDisplay.textColor}`}>
                {dlqDisplay.text}
              </div>
            </div>
          </div>

          {/* Bottom-Right Plaque: AEGISGRID 3D — Powered by ArchVault */}
          <button
            type="button"
            onClick={onOpenVaultModal}
            className="group relative rounded-md px-3.5 py-2 bg-gradient-to-b from-[#171C27] to-[#0D1017] border border-amber-500/35 hover:border-amber-400/80 shadow-[0_4px_20px_rgba(0,0,0,0.65)] flex items-center gap-3 transition cursor-pointer text-left ml-auto lg:ml-0"
          >
            {/* Geometric ArchVault Shield Emblem */}
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-400/40 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="none">
                <path
                  d="M12 2.5L4.5 6v5.8c0 5.1 3.2 9.7 7.5 11.2 4.3-1.5 7.5-6.1 7.5-11.2V6L12 2.5z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M12 7l-4 7.5h2.8L12 12l1.2 2.5H16L12 7z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-extrabold tracking-[0.11em] text-slate-100 leading-none group-hover:text-amber-200 transition">
                AEGISGRID 3D
              </div>
              <div className="text-[9.5px] font-medium tracking-[0.08em] text-slate-400 mt-1">
                Powered by <span className="font-bold text-amber-400">ARCHVAULT</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
