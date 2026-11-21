namespace AegisGrid.Api.Domain;

public sealed record PacketFlowFrame(
    string Id,
    string Source,
    string Target,
    int RatePerSec,
    string Kind);

public sealed record TelemetryFrame(
    long Sequence,
    DateTimeOffset TimestampUtc,
    int RequestsPerSec,
    double P95LatencyMs,
    int OpaBlockedPerMin,
    string CircuitState,
    int DlqDepth,
    string DlqIngestStatus,
    long DlqReplayedTotal,
    long HmacVerifiedCount,
    bool McpAttackActive,
    bool FailureInjected,
    bool ReplayActive,
    int CpuLoadPct,
    int ChannelLoadPct,
    string? LastSecurityEvent,
    PacketFlowFrame[] ActiveFlows);

public sealed record ChaosCommandRequest(bool? Active);

public sealed record ChaosActionResponse(
    string Action,
    string Status,
    bool McpAttackActive,
    bool FailureInjected,
    string CircuitState,
    int DlqDepth,
    DateTimeOffset TimestampUtc);

public sealed record ReplayActionResponse(
    string Action,
    string Status,
    int QueuedForReplay,
    string CircuitState,
    DateTimeOffset TimestampUtc);

public sealed record HealthCheckResponse(
    string Service,
    string Runtime,
    string Status,
    string CircuitState,
    int DlqDepth,
    DateTimeOffset TimestampUtc);
