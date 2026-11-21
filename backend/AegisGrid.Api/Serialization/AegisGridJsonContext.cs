using System.Text.Json.Serialization;
using AegisGrid.Api.Domain;

namespace AegisGrid.Api.Serialization;

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    WriteIndented = false)]
[JsonSerializable(typeof(TelemetryFrame))]
[JsonSerializable(typeof(PacketFlowFrame))]
[JsonSerializable(typeof(PacketFlowFrame[]))]
[JsonSerializable(typeof(ChaosCommandRequest))]
[JsonSerializable(typeof(ChaosActionResponse))]
[JsonSerializable(typeof(ReplayActionResponse))]
[JsonSerializable(typeof(HealthCheckResponse))]
public sealed partial class AegisGridJsonContext : JsonSerializerContext;
