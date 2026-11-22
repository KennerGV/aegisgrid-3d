import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CircuitState,
  ConnectionMode,
  SparklineSample,
  TelemetryFrame,
} from '../types/telemetry';

const EXPLICIT_API_URL = import.meta.env.VITE_API_URL as string | undefined;
const RAW_API_URL = EXPLICIT_API_URL ?? 'http://localhost:5000';
export const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '');

// On public HTTPS static hosts (e.g. GitHub Pages) without an explicit VITE_API_URL,
// boot straight into standalone browser simulation with zero mixed-content/loopback probes.
const IS_STATIC_HTTPS_DEMO =
  !EXPLICIT_API_URL &&
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

const SPARKLINE_HISTORY_LEN = 68;

const INITIAL_FRAME: TelemetryFrame = {
  sequence: 0,
  timestampUtc: new Date().toISOString(),
  requestsPerSec: 184,
  p95LatencyMs: 12.0,
  opaBlockedPerMin: 0,
  circuitState: 'CLOSED',
  dlqDepth: 0,
  dlqIngestStatus: 'STANDBY',
  dlqReplayedTotal: 0,
  hmacVerifiedCount: 1420,
  mcpAttackActive: false,
  failureInjected: false,
  replayActive: false,
  cpuLoadPct: 34,
  channelLoadPct: 11,
  lastSecurityEvent: null,
  activeFlows: [
    { id: 'agent-to-opa', source: 'AgentHub', target: 'OpaGate', ratePerSec: 184, kind: 'NOMINAL' },
    { id: 'opa-to-gateway', source: 'OpaGate', target: 'ApiGateway', ratePerSec: 184, kind: 'NOMINAL' },
    { id: 'gateway-to-worker', source: 'ApiGateway', target: 'DownstreamWorker', ratePerSec: 184, kind: 'NOMINAL' },
    { id: 'mcp-attack-vector', source: 'ThreatPerimeter', target: 'OpaGate', ratePerSec: 0, kind: 'ATTACK' },
    { id: 'worker-to-dlq', source: 'ApiGateway', target: 'DlqSpiral', ratePerSec: 0, kind: 'DIVERTED' },
    { id: 'dlq-replay-bus', source: 'DlqSpiral', target: 'DownstreamWorker', ratePerSec: 0, kind: 'REPLAY' },
  ],
};

function createInitialSparkline(): SparklineSample[] {
  const arr: SparklineSample[] = [];
  for (let i = 0; i < SPARKLINE_HISTORY_LEN; i++) {
    const wave = Math.sin(i * 0.25) * 22 + Math.cos(i * 0.6) * 11;
    arr.push({
      seq: i,
      rps: Math.round(178 + wave),
      latencyMs: 11.5 + Math.abs(Math.sin(i * 0.4)) * 2.2,
      blocked: 0,
    });
  }
  return arr;
}

interface LocalSimState {
  seq: number;
  mcpAttackUntilMs: number;
  failureInjected: boolean;
  failureStartedMs: number;
  circuitOpenedMs: number;
  circuitState: CircuitState;
  dlqDepth: number;
  dlqReplayedTotal: number;
  hmacVerifiedCount: number;
  replayActive: boolean;
  blockedTimestampsMs: number[];
  lastSecurityEvent: string | null;
}

const POISONED_EVENTS = [
  "OPA-TOOL-403: Blocked forbidden MCP tool 'drop_table'",
  "OPA-EGRESS-451: Blocked unauthorized external exfiltration target 'https://exfil-shadow-c2.io/collect'",
  "OPA-PAYLOAD-422: Blocked poisoned argument signature '169.254.169.254'",
  "OPA-OAUTH-201: Missing mandatory OAuth 2.1 scope 'mcp:tools:invoke'",
];

export function useTelemetryStream() {
  const initialMode: ConnectionMode = IS_STATIC_HTTPS_DEMO ? 'LOCAL_SIM' : 'CONNECTING';
  const [frame, setFrame] = useState<TelemetryFrame>(INITIAL_FRAME);
  const [mode, setMode] = useState<ConnectionMode>(initialMode);
  const [sparkline, setSparkline] = useState<SparklineSample[]>(createInitialSparkline);

  // Zero-re-render mutable ref consumed directly inside Three.js useFrame at 60 FPS
  const telemetryRef = useRef<TelemetryFrame>(INITIAL_FRAME);
  const modeRef = useRef<ConnectionMode>(initialMode);

  const localSimRef = useRef<LocalSimState>({
    seq: 1,
    mcpAttackUntilMs: 0,
    failureInjected: false,
    failureStartedMs: 0,
    circuitOpenedMs: 0,
    circuitState: 'CLOSED',
    dlqDepth: 0,
    dlqReplayedTotal: 0,
    hmacVerifiedCount: 1420,
    replayActive: false,
    blockedTimestampsMs: [],
    lastSecurityEvent: null,
  });

  const pushFrame = useCallback((next: TelemetryFrame) => {
    telemetryRef.current = next;
    setFrame(next);
    setSparkline((prev) => {
      const sample: SparklineSample = {
        seq: next.sequence,
        rps: next.requestsPerSec,
        latencyMs: next.p95LatencyMs,
        blocked: next.opaBlockedPerMin,
      };
      if (prev.length >= SPARKLINE_HISTORY_LEN) {
        return [...prev.slice(prev.length - SPARKLINE_HISTORY_LEN + 1), sample];
      }
      return [...prev, sample];
    });
  }, []);

  useEffect(() => {
    let disposed = false;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastLiveFrameAt = 0;

    const connectSse = () => {
      if (disposed) return;

      try {
        const es = new EventSource(`${API_BASE_URL}/api/telemetry/stream`);
        eventSource = es;

        es.onopen = () => {
          if (disposed) return;
          lastLiveFrameAt = Date.now();
          modeRef.current = 'LIVE_SSE';
          setMode('LIVE_SSE');
        };

        es.onmessage = (ev) => {
          if (disposed) return;
          try {
            const parsed = JSON.parse(ev.data) as TelemetryFrame;
            lastLiveFrameAt = Date.now();
            if (modeRef.current !== 'LIVE_SSE') {
              modeRef.current = 'LIVE_SSE';
              setMode('LIVE_SSE');
            }
            pushFrame(parsed);
          } catch {
            // Ignore malformed frame
          }
        };

        es.onerror = () => {
          es.close();
          eventSource = null;
          if (disposed) return;

          if (modeRef.current !== 'LOCAL_SIM') {
            modeRef.current = 'LOCAL_SIM';
            setMode('LOCAL_SIM');
          }

          reconnectTimeout = setTimeout(connectSse, 4500);
        };
      } catch {
        modeRef.current = 'LOCAL_SIM';
        setMode('LOCAL_SIM');
        reconnectTimeout = setTimeout(connectSse, 5000);
      }
    };

    if (!IS_STATIC_HTTPS_DEMO) {
      connectSse();
    }

    // Seamless 150ms local standalone physics/resilience engine when backend is offline
    const simTimer = setInterval(() => {
      if (disposed || (typeof document !== 'undefined' && document.hidden)) return;
      const now = Date.now();

      // Only emit local simulation ticks if SSE hasn't delivered a frame within 800ms
      if (modeRef.current === 'LIVE_SSE' && now - lastLiveFrameAt < 800) {
        return;
      }

      if (modeRef.current === 'CONNECTING' && now - lastLiveFrameAt > 950) {
        modeRef.current = 'LOCAL_SIM';
        setMode('LOCAL_SIM');
      }

      if (modeRef.current !== 'LOCAL_SIM') {
        return;
      }

      const sim = localSimRef.current;
      sim.seq += 1;

      const wave = Math.sin(now / 2300) * 32 + Math.cos(now / 920) * 14;
      const jitter = (Math.random() - 0.5) * 18;
      const rps = Math.max(120, Math.min(250, Math.round(182 + wave + jitter)));

      const attackActive = now < sim.mcpAttackUntilMs;
      if (attackActive) {
        const blockedBurst = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < blockedBurst; i++) {
          sim.blockedTimestampsMs.push(now);
        }
        sim.lastSecurityEvent =
          POISONED_EVENTS[Math.floor(Math.random() * POISONED_EVENTS.length)] ?? null;
      }

      const cutoff60s = now - 60_000;
      while (sim.blockedTimestampsMs.length > 0 && (sim.blockedTimestampsMs[0] ?? 0) < cutoff60s) {
        sim.blockedTimestampsMs.shift();
      }
      const opaBlockedPerMin = sim.blockedTimestampsMs.length;

      // Polly v8 Adaptive Circuit Breaker state machine simulation (BreakDuration = 10s)
      if (sim.failureInjected) {
        if (sim.circuitState === 'CLOSED' && now - sim.failureStartedMs > 320) {
          sim.circuitState = 'OPEN';
          sim.circuitOpenedMs = now;
        } else if (sim.circuitState === 'OPEN' && now - sim.circuitOpenedMs >= 10_000) {
          sim.circuitState = 'HALF_OPEN';
        } else if (sim.circuitState === 'HALF_OPEN') {
          // Probe fails while failureInjected remains true -> re-open
          sim.circuitState = 'OPEN';
          sim.circuitOpenedMs = now;
        }
      } else {
        if (sim.circuitState === 'OPEN' && now - sim.circuitOpenedMs >= 10_000) {
          sim.circuitState = 'HALF_OPEN';
        } else if (sim.circuitState === 'HALF_OPEN') {
          sim.circuitState = 'CLOSED';
        }
      }

      // Bounded DLQ accumulation & replay drain
      if (sim.replayActive) {
        if (sim.dlqDepth > 0) {
          const drained = Math.min(sim.dlqDepth, 24);
          sim.dlqDepth -= drained;
          sim.dlqReplayedTotal += drained;
          sim.hmacVerifiedCount += drained;
        } else {
          sim.replayActive = false;
        }
      } else if (sim.failureInjected || sim.circuitState === 'OPEN') {
        sim.dlqDepth = Math.min(2048, sim.dlqDepth + 5 + Math.floor(Math.random() * 4));
      }

      sim.hmacVerifiedCount += 2;

      let p95LatencyMs = 11.4 + Math.random() * 2.1;
      if (sim.failureInjected && sim.circuitState === 'CLOSED') {
        p95LatencyMs = 240 + Math.random() * 95;
      } else if (sim.circuitState === 'OPEN') {
        p95LatencyMs = sim.failureInjected ? 186 + Math.random() * 42 : 6.2 + Math.random() * 2.4;
      } else if (sim.circuitState === 'HALF_OPEN') {
        p95LatencyMs = 28 + Math.random() * 14;
      }
      p95LatencyMs = Math.round(p95LatencyMs * 10) / 10;

      const dlqIngestStatus = sim.replayActive
        ? 'REPLAYING'
        : sim.failureInjected || sim.circuitState === 'OPEN' || sim.dlqDepth > 0
          ? 'ACTIVE'
          : 'STANDBY';

      const attackRate = attackActive ? 145 : 0;
      const divertedRate =
        sim.circuitState === 'OPEN' || sim.failureInjected ? Math.round(rps * 0.88) : 0;
      const workerRate = Math.max(0, rps - divertedRate);
      const replayRate = sim.replayActive ? 220 : 0;

      const cpuLoadPct = Math.min(
        96,
        Math.round(
          18 +
            rps / 10 +
            (attackActive ? 22 : 0) +
            (sim.failureInjected ? 14 : 0) +
            (sim.replayActive ? 12 : 0)
        )
      );
      const channelLoadPct = Math.min(100, Math.max(5, Math.round((sim.dlqDepth / 2048) * 100 + rps / 24)));

      pushFrame({
        sequence: sim.seq,
        timestampUtc: new Date(now).toISOString(),
        requestsPerSec: rps,
        p95LatencyMs,
        opaBlockedPerMin,
        circuitState: sim.circuitState,
        dlqDepth: sim.dlqDepth,
        dlqIngestStatus,
        dlqReplayedTotal: sim.dlqReplayedTotal,
        hmacVerifiedCount: sim.hmacVerifiedCount,
        mcpAttackActive: attackActive,
        failureInjected: sim.failureInjected,
        replayActive: sim.replayActive,
        cpuLoadPct,
        channelLoadPct,
        lastSecurityEvent: sim.lastSecurityEvent,
        activeFlows: [
          { id: 'agent-to-opa', source: 'AgentHub', target: 'OpaGate', ratePerSec: rps + attackRate, kind: 'NOMINAL' },
          { id: 'opa-to-gateway', source: 'OpaGate', target: 'ApiGateway', ratePerSec: rps, kind: 'NOMINAL' },
          { id: 'gateway-to-worker', source: 'ApiGateway', target: 'DownstreamWorker', ratePerSec: workerRate, kind: 'NOMINAL' },
          { id: 'mcp-attack-vector', source: 'ThreatPerimeter', target: 'OpaGate', ratePerSec: attackRate, kind: 'ATTACK' },
          { id: 'worker-to-dlq', source: 'ApiGateway', target: 'DlqSpiral', ratePerSec: divertedRate, kind: 'DIVERTED' },
          { id: 'dlq-replay-bus', source: 'DlqSpiral', target: 'DownstreamWorker', ratePerSec: replayRate, kind: 'REPLAY' },
        ],
      });
    }, 150);

    return () => {
      disposed = true;
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(simTimer);
    };
  }, [pushFrame]);

  const toggleMcpAttack = useCallback(async () => {
    const nextActive = !telemetryRef.current.mcpAttackActive;

    // Always update local sim state too for seamless fallback parity
    localSimRef.current.mcpAttackUntilMs = nextActive ? Date.now() + 12_000 : 0;

    if (modeRef.current === 'LIVE_SSE') {
      try {
        await fetch(`${API_BASE_URL}/api/chaos/mcp-attack`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: nextActive }),
        });
      } catch {
        // Fallback handled automatically by localSimRef
      }
    }
  }, []);

  const toggleInjectFailure = useCallback(async () => {
    const nextActive = !telemetryRef.current.failureInjected;

    const sim = localSimRef.current;
    sim.failureInjected = nextActive;
    if (nextActive) {
      sim.failureStartedMs = Date.now();
    } else {
      sim.circuitState = 'CLOSED';
    }

    if (modeRef.current === 'LIVE_SSE') {
      try {
        await fetch(`${API_BASE_URL}/api/chaos/inject-failure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: nextActive }),
        });
      } catch {
        // Fallback handled automatically by localSimRef
      }
    }
  }, []);

  const triggerReplayDlq = useCallback(async () => {
    const sim = localSimRef.current;
    sim.failureInjected = false;
    sim.circuitState = 'CLOSED';
    if (sim.dlqDepth > 0) {
      sim.replayActive = true;
    }

    if (modeRef.current === 'LIVE_SSE') {
      try {
        await fetch(`${API_BASE_URL}/api/chaos/replay-dlq`, {
          method: 'POST',
        });
      } catch {
        // Fallback handled automatically by localSimRef
      }
    }
  }, []);

  return {
    frame,
    telemetryRef,
    mode,
    sparkline,
    toggleMcpAttack,
    toggleInjectFailure,
    triggerReplayDlq,
  };
}
