namespace AegisGrid.Api.Security;

public readonly record struct McpToolInvocation(
    string ToolName,
    string ArgumentsPayload,
    string? EgressUri,
    string OAuthScopes,
    string TenantId);

public readonly record struct OpaPolicyDecision(
    bool IsAllowed,
    string PolicyRuleId,
    string Reason)
{
    public static OpaPolicyDecision Allow() => new(true, "OPA-MCP-ALLOW", "Policy checks passed");

    public static OpaPolicyDecision Deny(string ruleId, string reason) => new(false, ruleId, reason);
}

/// <summary>
/// Deterministic zero-allocation policy evaluator implementing ArchVault's
/// Enterprise MCP Server Gateway, OAuth 2.1 Delegation &amp; OPA Tool Guardrails pattern.
/// </summary>
public sealed class OpaPolicyEvaluator
{
    private const string RequiredToolScope = "mcp:tools:invoke";
    private const string InternalMeshSuffix = ".aegisgrid.internal";

    private static readonly string[] ForbiddenTools =
    [
        "drop_table",
        "truncate_schema",
        "exec_host_shell",
        "dump_secrets",
        "override_iam_policy"
    ];

    private static readonly string[] PoisonedPayloadMarkers =
    [
        "drop table",
        "truncate table",
        "169.254.169.254",
        "metadata.google.internal",
        "/etc/shadow",
        "xp_cmdshell",
        "--exfiltrate"
    ];

    public OpaPolicyDecision Evaluate(in McpToolInvocation invocation)
    {
        if (string.IsNullOrWhiteSpace(invocation.TenantId))
        {
            return OpaPolicyDecision.Deny("OPA-MCP-000", "Missing tenant isolation boundary");
        }

        // 1. OAuth 2.1 Delegated Scope Verification
        if (!HasValidDelegatedScope(invocation.OAuthScopes, out var scopeViolation))
        {
            return OpaPolicyDecision.Deny("OPA-OAUTH-201", scopeViolation);
        }

        // 2. Deterministic Destructive Tool Denylist
        foreach (var forbidden in ForbiddenTools)
        {
            if (invocation.ToolName.Equals(forbidden, StringComparison.OrdinalIgnoreCase))
            {
                return OpaPolicyDecision.Deny("OPA-TOOL-403", $"Blocked forbidden MCP tool '{invocation.ToolName}'");
            }
        }

        // 3. Payload Injection & Metadata SSRF Inspection
        foreach (var marker in PoisonedPayloadMarkers)
        {
            if (invocation.ArgumentsPayload.Contains(marker, StringComparison.OrdinalIgnoreCase))
            {
                return OpaPolicyDecision.Deny("OPA-PAYLOAD-422", $"Blocked poisoned argument signature '{marker}'");
            }
        }

        // 4. External Data Exfiltration Egress Guardrail
        if (!string.IsNullOrWhiteSpace(invocation.EgressUri))
        {
            if (!Uri.TryCreate(invocation.EgressUri, UriKind.Absolute, out var parsedUri) ||
                !parsedUri.Host.EndsWith(InternalMeshSuffix, StringComparison.OrdinalIgnoreCase))
            {
                return OpaPolicyDecision.Deny(
                    "OPA-EGRESS-451",
                    $"Blocked unauthorized external exfiltration target '{invocation.EgressUri}'");
            }
        }

        return OpaPolicyDecision.Allow();
    }

    private static bool HasValidDelegatedScope(string scopesRaw, out string violation)
    {
        if (string.IsNullOrWhiteSpace(scopesRaw))
        {
            violation = "Missing OAuth 2.1 delegated bearer scopes";
            return false;
        }

        var hasRequiredInvoke = false;
        var span = scopesRaw.AsSpan();

        foreach (var range in span.Split(' '))
        {
            var token = span[range].Trim();
            if (token.IsEmpty)
            {
                continue;
            }

            if (token.Equals("admin:root", StringComparison.OrdinalIgnoreCase) ||
                token.Equals("*:*", StringComparison.Ordinal))
            {
                violation = $"Rejected privilege-escalation wildcard scope '{token}'";
                return false;
            }

            if (token.Equals(RequiredToolScope, StringComparison.Ordinal))
            {
                hasRequiredInvoke = true;
            }
        }

        if (!hasRequiredInvoke)
        {
            violation = $"Missing mandatory OAuth 2.1 scope '{RequiredToolScope}'";
            return false;
        }

        violation = string.Empty;
        return true;
    }
}
