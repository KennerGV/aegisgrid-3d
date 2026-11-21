using System.Collections.Concurrent;
using System.Threading.Channels;
using AegisGrid.Api.Domain;
using AegisGrid.Api.Security;

namespace AegisGrid.Api.Resilience;

public sealed record DeadLetterEnvelope(
    string IdempotencyKey,
    string Route,
    byte[] PayloadBytes,
    long SignedAtUnixSeconds,
    string HmacSignature);

/// <summary>
/// Bounded System.Threading.Channels Dead-Letter Queue with constant-time HMAC verification
/// and atomic idempotency deduplication via ConcurrentDictionary&lt;string, DateTimeOffset&gt;.
/// </summary>
public sealed class DlqRecoveryWorker : BackgroundService
{
    public const int MaxDlqCapacity = 2_048;
    private static readonly TimeSpan IdempotencyLedgerTtl = TimeSpan.FromMinutes(10);

    private readonly Channel<DeadLetterEnvelope> _dlqChannel;
    private readonly Channel<bool> _replayTriggerChannel;
    private readonly ConcurrentDictionary<string, DateTimeOffset> _idempotencyLedger = new(StringComparer.Ordinal);

    private readonly GridState _gridState;
    private readonly HmacWebhookVerifier _hmacVerifier;
    private readonly ResiliencePipelineHost _resilienceHost;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<DlqRecoveryWorker> _logger;

    public DlqRecoveryWorker(
        GridState gridState,
        HmacWebhookVerifier hmacVerifier,
        ResiliencePipelineHost resilienceHost,
        TimeProvider timeProvider,
        ILogger<DlqRecoveryWorker> logger)
    {
        _gridState = gridState;
        _hmacVerifier = hmacVerifier;
        _resilienceHost = resilienceHost;
        _timeProvider = timeProvider;
        _logger = logger;

        _dlqChannel = Channel.CreateBounded<DeadLetterEnvelope>(new BoundedChannelOptions(MaxDlqCapacity)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false,
            AllowSynchronousContinuations = false
        });

        _replayTriggerChannel = Channel.CreateBounded<bool>(new BoundedChannelOptions(8)
        {
            FullMode = BoundedChannelFullMode.DropWrite,
            SingleReader = true,
            SingleWriter = false,
            AllowSynchronousContinuations = false
        });
    }

    public int CurrentDepth => _dlqChannel.Reader.Count;

    public bool TryEnqueueFailedWork(in WorkEnvelope work)
    {
        var payloadCopy = work.PayloadBytes.ToArray();
        var signature = _hmacVerifier.SignEnvelope(payloadCopy, work.CreatedUnixSeconds);

        var deadLetter = new DeadLetterEnvelope(
            IdempotencyKey: work.IdempotencyKey,
            Route: work.Route,
            PayloadBytes: payloadCopy,
            SignedAtUnixSeconds: work.CreatedUnixSeconds,
            HmacSignature: signature);

        var written = _dlqChannel.Writer.TryWrite(deadLetter);
        _gridState.UpdateDlqMetrics(_dlqChannel.Reader.Count, MaxDlqCapacity);
        return written;
    }

    public int RequestReplay()
    {
        var queued = _dlqChannel.Reader.Count;
        _replayTriggerChannel.Writer.TryWrite(true);
        return queued;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var _ in _replayTriggerChannel.Reader.ReadAllAsync(stoppingToken))
        {
            await DrainAndReplayAsync(stoppingToken);
        }
    }

    private async Task DrainAndReplayAsync(CancellationToken ct)
    {
        if (_dlqChannel.Reader.Count == 0)
        {
            _gridState.UpdateDlqMetrics(0, MaxDlqCapacity);
            return;
        }

        // Ensure downstream chaos fault is cleared and circuit is probed/closed before replay
        _gridState.SetFailureInjected(false);
        await _resilienceHost.RecoverBreakerAsync(ct);

        _gridState.SetReplayActive(true);
        PruneExpiredIdempotencyKeys();

        try
        {
            using var pacingTimer = new PeriodicTimer(TimeSpan.FromMilliseconds(90), _timeProvider);
            const int batchSize = 28;

            while (_dlqChannel.Reader.Count > 0 && !ct.IsCancellationRequested)
            {
                var processedInBatch = 0;

                while (processedInBatch < batchSize && _dlqChannel.Reader.TryRead(out var item))
                {
                    processedInBatch++;

                    // 1. Constant-time HMAC-SHA256 verification before replay execution
                    if (!_hmacVerifier.VerifyEnvelope(item.PayloadBytes, item.SignedAtUnixSeconds, item.HmacSignature))
                    {
                        _logger.LogWarning("Rejected tampered or expired DLQ envelope {Key}", item.IdempotencyKey);
                        continue;
                    }

                    _gridState.RecordHmacVerified();

                    // 2. Atomic idempotency check (exactly-once side-effect guarantee)
                    var now = _timeProvider.GetUtcNow();
                    if (!_idempotencyLedger.TryAdd(item.IdempotencyKey, now))
                    {
                        continue;
                    }

                    // 3. Re-dispatch through Polly v8 ResiliencePipelineHost
                    var work = new WorkEnvelope(
                        item.IdempotencyKey,
                        item.Route,
                        item.PayloadBytes,
                        item.SignedAtUnixSeconds);

                    var result = await _resilienceHost.ExecuteAsync(work, ct);
                    if (result.Succeeded)
                    {
                        _gridState.RecordReplayedItem();
                    }
                    else
                    {
                        // Downstream fault re-occurred mid-replay; remove key & re-queue
                        _idempotencyLedger.TryRemove(item.IdempotencyKey, out _);
                        _dlqChannel.Writer.TryWrite(item);
                        break;
                    }
                }

                _gridState.UpdateDlqMetrics(_dlqChannel.Reader.Count, MaxDlqCapacity);

                if (_dlqChannel.Reader.Count > 0)
                {
                    await pacingTimer.WaitForNextTickAsync(ct);
                }
            }
        }
        finally
        {
            _gridState.UpdateDlqMetrics(_dlqChannel.Reader.Count, MaxDlqCapacity);
            _gridState.SetReplayActive(false);
        }
    }

    private void PruneExpiredIdempotencyKeys()
    {
        if (_idempotencyLedger.Count < 1_024)
        {
            return;
        }

        var cutoff = _timeProvider.GetUtcNow().Subtract(IdempotencyLedgerTtl);
        foreach (var entry in _idempotencyLedger)
        {
            if (entry.Value < cutoff)
            {
                _idempotencyLedger.TryRemove(entry.Key, out _);
            }
        }
    }
}
