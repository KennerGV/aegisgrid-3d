export type CircuitState = 'CLOSED' | 'HALF_OPEN' | 'OPEN';

export type DlqIngestStatus = 'STANDBY' | 'ACTIVE' | 'REPLAYING';

export type PacketFlowKind = 'NOMINAL' | 'ATTACK' | 'DIVERTED' | 'REPLAY';

export interface PacketFlowFrame {
  id: string;
  source: string;
  target: string;
  ratePerSec: number;
  kind: PacketFlowKind;
}

export interface TelemetryFrame {
  sequence: number;
  timestampUtc: string;
  requestsPerSec: number;
  p95LatencyMs: number;
  opaBlockedPerMin: number;
  circuitState: CircuitState;
  dlqDepth: number;
  dlqIngestStatus: DlqIngestStatus;
  dlqReplayedTotal: number;
  hmacVerifiedCount: number;
  mcpAttackActive: boolean;
  failureInjected: boolean;
  replayActive: boolean;
  cpuLoadPct: number;
  channelLoadPct: number;
  lastSecurityEvent?: string | null;
  activeFlows: PacketFlowFrame[];
}

export type ConnectionMode = 'CONNECTING' | 'LIVE_SSE' | 'LOCAL_SIM';

export interface SparklineSample {
  seq: number;
  rps: number;
  latencyMs: number;
  blocked: number;
}

export type VaultBlueprintId = 'dotnet-aot' | 'opa-mcp' | 'webhook-dlq';
