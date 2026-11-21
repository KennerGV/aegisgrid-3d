using AegisGrid.Api.Domain;
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;

namespace AegisGrid.Api.Resilience;

public sealed class DownstreamUnavailableException(string message) : Exception(message);

public readonly record struct WorkEnvelope(
    string IdempotencyKey,
    string Route,
    ReadOnlyMemory<byte> PayloadBytes,
    long CreatedUnixSeconds);

public readonly record struct DispatchResult(
    bool Succeeded,
    bool CircuitRejected,
    double SimulatedLatencyMs);

/// <summary>
/// Non-allocating Polly v8 resilience host combining exponential backoff + jitter
/// with an Adaptive Circuit Breaker (FailureRatio = 0.5, BreakDuration = 10s).
/// </summary>
public sealed class ResiliencePipelineHost
{
    private readonly GridState _gridState;
    private readonly TimeProvider _timeProvider;
    private readonly CircuitBreakerStateProvider _stateProvider = new();
    private readonly CircuitBreakerManualControl _manualControl = new();
    private readonly ResiliencePipeline<double> _pipeline;

    public ResiliencePipelineHost(GridState gridState, TimeProvider timeProvider)
    {
        _gridState = gridState;
        _timeProvider = timeProvider;

        var builder = new ResiliencePipelineBuilder<double>
        {
            TimeProvider = timeProvider
        };

        // Outer: Exponential backoff with decorrelated jitter for transient faults
        builder.AddRetry(new RetryStrategyOptions<double>
        {
            MaxRetryAttempts = 2,
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true,
            Delay = TimeSpan.FromMilliseconds(8),
            ShouldHandle = new PredicateBuilder<double>().Handle<DownstreamUnavailableException>()
        });

        // Inner: Adaptive Circuit Breaker (FailureRatio = 0.5, BreakDuration = 10s)
        builder.AddCircuitBreaker(new CircuitBreakerStrategyOptions<double>
        {
            FailureRatio = 0.5,
            SamplingDuration = TimeSpan.FromSeconds(1.2),
            MinimumThroughput = 4,
            BreakDuration = TimeSpan.FromSeconds(10),
            StateProvider = _stateProvider,
            ManualControl = _manualControl,
            ShouldHandle = new PredicateBuilder<double>().Handle<DownstreamUnavailableException>(),
            OnOpened = _ =>
            {
                _gridState.SetCircuitState("OPEN");
                return ValueTask.CompletedTask;
            },
            OnHalfOpened = _ =>
            {
                _gridState.SetCircuitState("HALF_OPEN");
                return ValueTask.CompletedTask;
            },
            OnClosed = _ =>
            {
                _gridState.SetCircuitState("CLOSED");
                return ValueTask.CompletedTask;
            }
        });

        _pipeline = builder.Build();
    }

    public string CurrentCircuitState => _stateProvider.CircuitState switch
    {
        CircuitState.Open or CircuitState.Isolated => "OPEN",
        CircuitState.HalfOpen => "HALF_OPEN",
        _ => "CLOSED"
    };

    public async ValueTask<DispatchResult> ExecuteAsync(WorkEnvelope envelope, CancellationToken cancellationToken)
    {
        try
        {
            var latencyMs = await _pipeline.ExecuteAsync(
                static (state, ct) => state.Self.InvokeDownstreamCoreAsync(state.Envelope, ct),
                (Self: this, Envelope: envelope),
                cancellationToken);

            _gridState.SetCircuitState(CurrentCircuitState);
            return new DispatchResult(Succeeded: true, CircuitRejected: false, SimulatedLatencyMs: latencyMs);
        }
        catch (BrokenCircuitException)
        {
            _gridState.SetCircuitState("OPEN");
            var fastFailMs = 4.2 + (Random.Shared.NextDouble() * 3.1);
            return new DispatchResult(Succeeded: false, CircuitRejected: true, SimulatedLatencyMs: fastFailMs);
        }
        catch (DownstreamUnavailableException)
        {
            _gridState.SetCircuitState(CurrentCircuitState);
            var degradedMs = 210.0 + (Random.Shared.NextDouble() * 165.0);
            return new DispatchResult(Succeeded: false, CircuitRejected: false, SimulatedLatencyMs: degradedMs);
        }
    }

    public async Task RecoverBreakerAsync(CancellationToken cancellationToken)
    {
        _gridState.SetCircuitState("HALF_OPEN");
        await _manualControl.CloseAsync(cancellationToken);
        _gridState.SetCircuitState("CLOSED");
    }

    private ValueTask<double> InvokeDownstreamCoreAsync(WorkEnvelope envelope, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        if (_gridState.IsFailureInjected)
        {
            throw new DownstreamUnavailableException(
                $"HTTP 503 Service Unavailable on downstream worker for key '{envelope.IdempotencyKey}'");
        }

        // Baseline healthy latency distribution (p50 ~9.5ms, p95 ~12-14ms)
        var tailSample = Random.Shared.NextDouble();
        var simulatedMs = tailSample > 0.92
            ? 11.8 + (Random.Shared.NextDouble() * 3.2)
            : 7.4 + (Random.Shared.NextDouble() * 4.2);

        return ValueTask.FromResult(simulatedMs);
    }
}
