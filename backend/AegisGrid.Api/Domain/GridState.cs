namespace AegisGrid.Api.Domain;

/// <summary>
/// Thread-safe, zero-reflection runtime telemetry state store governed by TimeProvider.
/// </summary>
public sealed class GridState(TimeProvider timeProvider)
{
    private const int LatencyWindowSize = 128;
    private const int BlockedBucketsCount = 60;

    private readonly Lock _metricsLock = new();
    private readonly double[] _latencySamplesMs = new double[LatencyWindowSize];
    private readonly double[] _scratchSortBuffer = new double[LatencyWindowSize];
    private readonly long[] _blockedBucketSecond = new long[BlockedBucketsCount];
    private readonly int[] _blockedBucketCount = new int[BlockedBucketsCount];

    private int _latencyWriteIndex;
    private int _latencySampleCount;

    private long _sequence;
    private int _requestsPerSec = 184;
    private int _p95LatencyTenthsMs = 120; // 12.0 ms
    private string _circuitState = "CLOSED";
    private int _dlqDepth;
    private int _dlqCapacity = 2048;
    private long _dlqReplayedTotal;
    private long _hmacVerifiedCount;
    private long _mcpAttackUntilUtcTicks;
    private int _failureInjected;
    private int _replayActive;
    private string? _lastSecurityEvent;

    public bool IsMcpAttackActive => timeProvider.GetUtcNow().UtcTicks < Interlocked.Read(ref _mcpAttackUntilUtcTicks);

    public bool IsFailureInjected => Volatile.Read(ref _failureInjected) == 1;

    public bool IsReplayActive => Volatile.Read(ref _replayActive) == 1;

    public string CircuitState => Volatile.Read(ref _circuitState);

    public int DlqDepth => Volatile.Read(ref _dlqDepth);

    public void TriggerMcpAttack(TimeSpan duration)
    {
        var untilTicks = timeProvider.GetUtcNow().Add(duration).UtcTicks;
        Interlocked.Exchange(ref _mcpAttackUntilUtcTicks, untilTicks);
    }

    public void StopMcpAttack()
    {
        Interlocked.Exchange(ref _mcpAttackUntilUtcTicks, 0L);
    }

    public bool SetFailureInjected(bool? explicitState)
    {
        if (explicitState.HasValue)
        {
            var next = explicitState.Value ? 1 : 0;
            Interlocked.Exchange(ref _failureInjected, next);
            return explicitState.Value;
        }

        while (true)
        {
            var current = Volatile.Read(ref _failureInjected);
            var toggled = current == 0 ? 1 : 0;
            if (Interlocked.CompareExchange(ref _failureInjected, toggled, current) == current)
            {
                return toggled == 1;
            }
        }
    }

    public void SetCircuitState(string state)
    {
        Volatile.Write(ref _circuitState, state);
    }

    public void SetReplayActive(bool active)
    {
        Interlocked.Exchange(ref _replayActive, active ? 1 : 0);
    }

    public void UpdateDlqMetrics(int currentDepth, int capacity)
    {
        Interlocked.Exchange(ref _dlqDepth, currentDepth);
        Interlocked.Exchange(ref _dlqCapacity, Math.Max(1, capacity));
    }

    public void RecordReplayedItem()
    {
        Interlocked.Increment(ref _dlqReplayedTotal);
    }

    public void RecordHmacVerified(int count = 1)
    {
        Interlocked.Add(ref _hmacVerifiedCount, count);
    }

    public void RecordOpaBlocked(int count, string reason)
    {
        if (count <= 0)
        {
            return;
        }

        Volatile.Write(ref _lastSecurityEvent, reason);
        var nowSec = timeProvider.GetUtcNow().ToUnixTimeSeconds();

        lock (_metricsLock)
        {
            var slot = (int)(nowSec % BlockedBucketsCount);
            if (_blockedBucketSecond[slot] != nowSec)
            {
                _blockedBucketSecond[slot] = nowSec;
                _blockedBucketCount[slot] = count;
            }
            else
            {
                _blockedBucketCount[slot] += count;
            }
        }
    }

    public void RecordTickTelemetry(int requestsPerSec, ReadOnlySpan<double> latencySamplesMs)
    {
        Interlocked.Exchange(ref _requestsPerSec, requestsPerSec);

        lock (_metricsLock)
        {
            foreach (var sample in latencySamplesMs)
            {
                _latencySamplesMs[_latencyWriteIndex] = sample;
                _latencyWriteIndex = (_latencyWriteIndex + 1) % LatencyWindowSize;
                if (_latencySampleCount < LatencyWindowSize)
                {
                    _latencySampleCount++;
                }
            }

            if (_latencySampleCount > 0)
            {
                Array.Copy(_latencySamplesMs, _scratchSortBuffer, _latencySampleCount);
                Array.Sort(_scratchSortBuffer, 0, _latencySampleCount);
                var p95Idx = Math.Clamp((int)Math.Ceiling(_latencySampleCount * 0.95) - 1, 0, _latencySampleCount - 1);
                var p95Tenths = (int)Math.Round(_scratchSortBuffer[p95Idx] * 10.0);
                Interlocked.Exchange(ref _p95LatencyTenthsMs, p95Tenths);
            }
        }
    }

    public int GetOpaBlockedPerMin()
    {
        var nowSec = timeProvider.GetUtcNow().ToUnixTimeSeconds();
        var cutoff = nowSec - 59;
        var total = 0;

        lock (_metricsLock)
        {
            for (var i = 0; i < BlockedBucketsCount; i++)
            {
                if (_blockedBucketSecond[i] >= cutoff)
                {
                    total += _blockedBucketCount[i];
                }
            }
        }

        return total;
    }

    public TelemetryFrame CaptureSnapshot()
    {
        var now = timeProvider.GetUtcNow();
        var seq = Interlocked.Increment(ref _sequence);
        var rps = Volatile.Read(ref _requestsPerSec);
        var p95Ms = Math.Round(Volatile.Read(ref _p95LatencyTenthsMs) / 10.0, 1);
        var blockedPerMin = GetOpaBlockedPerMin();
        var circuit = CircuitState;
        var dlqDepth = DlqDepth;
        var dlqCap = Math.Max(1, Volatile.Read(ref _dlqCapacity));
        var attackActive = now.UtcTicks < Interlocked.Read(ref _mcpAttackUntilUtcTicks);
        var failureActive = IsFailureInjected;
        var replayActive = IsReplayActive;

        var dlqStatus = replayActive
            ? "REPLAYING"
            : (failureActive || circuit == "OPEN" || dlqDepth > 0)
                ? "ACTIVE"
                : "STANDBY";

        var attackRate = attackActive ? 145 : 0;
        var gatewayRate = rps;
        var divertedRate = (circuit == "OPEN" || failureActive) ? (int)Math.Round(rps * 0.88) : 0;
        var workerNominalRate = Math.Max(0, gatewayRate - divertedRate);
        var replayRate = replayActive ? 220 : 0;

        var cpuLoad = Math.Clamp(
            18 + (rps / 10) + (attackActive ? 22 : 0) + (failureActive ? 14 : 0) + (replayActive ? 12 : 0),
            12,
            96);

        var channelLoad = Math.Clamp(
            (int)Math.Round((dlqDepth / (double)dlqCap) * 100.0) + (rps / 25),
            4,
            100);

        var flows = new PacketFlowFrame[]
        {
            new("agent-to-opa", "AgentHub", "OpaGate", rps + attackRate, "NOMINAL"),
            new("opa-to-gateway", "OpaGate", "ApiGateway", gatewayRate, "NOMINAL"),
            new("gateway-to-worker", "ApiGateway", "DownstreamWorker", workerNominalRate, "NOMINAL"),
            new("mcp-attack-vector", "ThreatPerimeter", "OpaGate", attackRate, "ATTACK"),
            new("worker-to-dlq", "ApiGateway", "DlqSpiral", divertedRate, "DIVERTED"),
            new("dlq-replay-bus", "DlqSpiral", "DownstreamWorker", replayRate, "REPLAY")
        };

        return new TelemetryFrame(
            Sequence: seq,
            TimestampUtc: now,
            RequestsPerSec: rps,
            P95LatencyMs: p95Ms,
            OpaBlockedPerMin: blockedPerMin,
            CircuitState: circuit,
            DlqDepth: dlqDepth,
            DlqIngestStatus: dlqStatus,
            DlqReplayedTotal: Interlocked.Read(ref _dlqReplayedTotal),
            HmacVerifiedCount: Interlocked.Read(ref _hmacVerifiedCount),
            McpAttackActive: attackActive,
            FailureInjected: failureActive,
            ReplayActive: replayActive,
            CpuLoadPct: cpuLoad,
            ChannelLoadPct: channelLoad,
            LastSecurityEvent: Volatile.Read(ref _lastSecurityEvent),
            ActiveFlows: flows);
    }
}
