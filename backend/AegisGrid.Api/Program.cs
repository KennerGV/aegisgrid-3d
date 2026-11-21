using System.Text.Json;
using AegisGrid.Api.Domain;
using AegisGrid.Api.Resilience;
using AegisGrid.Api.Security;
using AegisGrid.Api.Serialization;
using AegisGrid.Api.Workers;

var builder = WebApplication.CreateSlimBuilder(args);

// Default to port 5000 when ASPNETCORE_URLS is not explicitly configured
if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    builder.WebHost.UseUrls("http://0.0.0.0:5000");
}

// Graceful drain timeout per ArchVault 01 - .NET 10 Distributed Foundations
builder.Services.Configure<HostOptions>(options =>
{
    options.ShutdownTimeout = TimeSpan.FromSeconds(30);
});

// Zero-reflection source-generated JSON contract
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AegisGridJsonContext.Default);
});

// Permissive CORS for local WebGL HUD & static frontends
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

// Deterministic TimeProvider + ArchVault Security & Resilience singletons
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<GridState>();
builder.Services.AddSingleton<HmacWebhookVerifier>();
builder.Services.AddSingleton<OpaPolicyEvaluator>();
builder.Services.AddSingleton<ResiliencePipelineHost>();
builder.Services.AddSingleton<DlqRecoveryWorker>();
builder.Services.AddHostedService( static sp => sp.GetRequiredService<DlqRecoveryWorker>());
builder.Services.AddHostedService<TelemetrySimulationWorker>();

var app = builder.Build();
app.UseCors();

ReadOnlyMemory<byte> ssePrefix = "data: "u8.ToArray();
ReadOnlyMemory<byte> sseSuffix = "\n\n"u8.ToArray();

app.MapGet("/api/health", (GridState gridState, TimeProvider timeProvider) =>
{
    var payload = new HealthCheckResponse(
        Service: "AegisGrid.Api",
        Runtime: ".NET 10 Native-AOT Ready",
        Status: "HEALTHY",
        CircuitState: gridState.CircuitState,
        DlqDepth: gridState.DlqDepth,
        TimestampUtc: timeProvider.GetUtcNow());

    return Results.Json(payload, AegisGridJsonContext.Default.HealthCheckResponse);
});

// Server-Sent Events emitting TelemetryFrame JSON every 150ms (zero reflection)
app.MapGet("/api/telemetry/stream", async (
    HttpContext context,
    GridState gridState,
    TimeProvider timeProvider,
    CancellationToken ct) =>
{
    context.Response.Headers.ContentType = "text/event-stream; charset=utf-8";
    context.Response.Headers.CacheControl = "no-cache, no-transform";
    context.Response.Headers.Connection = "keep-alive";
    context.Response.Headers["X-Accel-Buffering"] = "no";

    await context.Response.StartAsync(ct);

    // Emit initial frame immediately upon connection
    await WriteFrameAsync(context, gridState.CaptureSnapshot(), ssePrefix, sseSuffix, ct);

    using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(150), timeProvider);
    try
    {
        while (await timer.WaitForNextTickAsync(ct))
        {
            var frame = gridState.CaptureSnapshot();
            await WriteFrameAsync(context, frame, ssePrefix, sseSuffix, ct);
        }
    }
    catch (OperationCanceledException)
    {
        // Normal client SSE disconnect
    }
});

// Triggers a 12s burst of poisoned MCP payloads blocked by OpaPolicyEvaluator (or cancels if active=false)
app.MapPost("/api/chaos/mcp-attack", async (
    HttpContext context,
    GridState gridState,
    TimeProvider timeProvider,
    CancellationToken ct) =>
{
    var explicitActive = await ReadOptionalActiveFlagAsync(context, ct);
    if (explicitActive == false)
    {
        gridState.StopMcpAttack();
    }
    else
    {
        gridState.TriggerMcpAttack(TimeSpan.FromSeconds(12));
    }

    var response = new ChaosActionResponse(
        Action: "mcp-attack",
        Status: gridState.IsMcpAttackActive ? "ATTACK_BURST_ACTIVE_12S" : "STOPPED",
        McpAttackActive: gridState.IsMcpAttackActive,
        FailureInjected: gridState.IsFailureInjected,
        CircuitState: gridState.CircuitState,
        DlqDepth: gridState.DlqDepth,
        TimestampUtc: timeProvider.GetUtcNow());

    return Results.Json(response, AegisGridJsonContext.Default.ChaosActionResponse);
});

// Triggers/toggles downstream 503 latency/errors, tripping Polly Circuit Breaker to OPEN & routing to DLQ
app.MapPost("/api/chaos/inject-failure", async (
    HttpContext context,
    GridState gridState,
    ResiliencePipelineHost resilienceHost,
    TimeProvider timeProvider,
    CancellationToken ct) =>
{
    var explicitActive = await ReadOptionalActiveFlagAsync(context, ct);
    var nowActive = gridState.SetFailureInjected(explicitActive);

    // When explicitly turned off, allow Polly to transition cleanly or probe recovery
    if (!nowActive && explicitActive == false)
    {
        await resilienceHost.RecoverBreakerAsync(ct);
    }

    var response = new ChaosActionResponse(
        Action: "inject-failure",
        Status: nowActive ? "DOWNSTREAM_503_INJECTED" : "DOWNSTREAM_RECOVERED",
        McpAttackActive: gridState.IsMcpAttackActive,
        FailureInjected: nowActive,
        CircuitState: gridState.CircuitState,
        DlqDepth: gridState.DlqDepth,
        TimestampUtc: timeProvider.GetUtcNow());

    return Results.Json(response, AegisGridJsonContext.Default.ChaosActionResponse);
});

// Drains and idempotently replays DLQ items once recovered
app.MapPost("/api/chaos/replay-dlq", (
    DlqRecoveryWorker dlqWorker,
    GridState gridState,
    TimeProvider timeProvider) =>
{
    var queuedCount = dlqWorker.RequestReplay();

    var response = new ReplayActionResponse(
        Action: "replay-dlq",
        Status: queuedCount > 0 ? "REPLAY_INITIATED" : "DLQ_EMPTY",
        QueuedForReplay: queuedCount,
        CircuitState: gridState.CircuitState,
        TimestampUtc: timeProvider.GetUtcNow());

    return Results.Json(response, AegisGridJsonContext.Default.ReplayActionResponse);
});

await app.RunAsync();
return;

static async ValueTask WriteFrameAsync(
    HttpContext context,
    TelemetryFrame frame,
    ReadOnlyMemory<byte> prefix,
    ReadOnlyMemory<byte> suffix,
    CancellationToken ct)
{
    var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(frame, AegisGridJsonContext.Default.TelemetryFrame);
    await context.Response.Body.WriteAsync(prefix, ct);
    await context.Response.Body.WriteAsync(jsonBytes, ct);
    await context.Response.Body.WriteAsync(suffix, ct);
    await context.Response.Body.FlushAsync(ct);
}

static async ValueTask<bool?> ReadOptionalActiveFlagAsync(HttpContext context, CancellationToken ct)
{
    if (context.Request.Query.TryGetValue("active", out var queryVal) &&
        bool.TryParse(queryVal.ToString(), out var parsedQuery))
    {
        return parsedQuery;
    }

    if (context.Request.ContentLength is > 0)
    {
        try
        {
            var body = await JsonSerializer.DeserializeAsync(
                context.Request.Body,
                AegisGridJsonContext.Default.ChaosCommandRequest,
                ct);
            return body?.Active;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    return null;
}
