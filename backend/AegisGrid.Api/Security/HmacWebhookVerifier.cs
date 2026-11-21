using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

namespace AegisGrid.Api.Security;

/// <summary>
/// Constant-time HMAC-SHA256 envelope signer and verifier implementing ArchVault's
/// Cryptographic Webhook Delivery &amp; Replay Protection pattern.
/// </summary>
public sealed class HmacWebhookVerifier
{
    private const string SignaturePrefix = "sha256=";
    private static readonly TimeSpan MaxReplayWindow = TimeSpan.FromMinutes(5);

    private readonly byte[] _signingKey;
    private readonly TimeProvider _timeProvider;

    public HmacWebhookVerifier(TimeProvider timeProvider)
    {
        _timeProvider = timeProvider;

        var configuredBase64 = Environment.GetEnvironmentVariable("AEGISGRID_HMAC_KEY_BASE64");
        if (!string.IsNullOrWhiteSpace(configuredBase64))
        {
            var decoded = Convert.FromBase64String(configuredBase64);
            _signingKey = decoded.Length >= 32 ? decoded : RandomNumberGenerator.GetBytes(32);
        }
        else
        {
            // Ephemeral in-memory 256-bit signing key (zero static secrets on disk)
            _signingKey = RandomNumberGenerator.GetBytes(32);
        }
    }

    public string SignEnvelope(ReadOnlySpan<byte> payload, long unixTimestampSeconds)
    {
        Span<byte> digest = stackalloc byte[HMACSHA256.HashSizeInBytes];
        ComputeCanonicalDigest(payload, unixTimestampSeconds, digest);
        return string.Concat(SignaturePrefix, Convert.ToHexStringLower(digest));
    }

    public bool VerifyEnvelope(ReadOnlySpan<byte> payload, long unixTimestampSeconds, ReadOnlySpan<char> signatureHeader)
    {
        var nowSeconds = _timeProvider.GetUtcNow().ToUnixTimeSeconds();
        var skewSeconds = Math.Abs(nowSeconds - unixTimestampSeconds);
        if (skewSeconds > (long)MaxReplayWindow.TotalSeconds)
        {
            return false;
        }

        if (signatureHeader.StartsWith(SignaturePrefix, StringComparison.OrdinalIgnoreCase))
        {
            signatureHeader = signatureHeader[SignaturePrefix.Length..];
        }

        if (signatureHeader.Length != HMACSHA256.HashSizeInBytes * 2)
        {
            return false;
        }

        Span<byte> providedDigest = stackalloc byte[HMACSHA256.HashSizeInBytes];
        if (Convert.FromHexString(signatureHeader, providedDigest, out _, out var bytesWritten) != System.Buffers.OperationStatus.Done ||
            bytesWritten != HMACSHA256.HashSizeInBytes)
        {
            return false;
        }

        Span<byte> expectedDigest = stackalloc byte[HMACSHA256.HashSizeInBytes];
        ComputeCanonicalDigest(payload, unixTimestampSeconds, expectedDigest);

        return CryptographicOperations.FixedTimeEquals(expectedDigest, providedDigest);
    }

    public bool VerifyRawSignature(string rawPayload, long unixTimestampSeconds, string signatureHeader)
    {
        var utf8Bytes = Encoding.UTF8.GetBytes(rawPayload);
        return VerifyEnvelope(utf8Bytes, unixTimestampSeconds, signatureHeader);
    }

    private void ComputeCanonicalDigest(ReadOnlySpan<byte> payload, long unixTimestampSeconds, Span<byte> destination)
    {
        var totalLen = sizeof(long) + 1 + payload.Length;
        byte[]? rented = null;
        Span<byte> canonical = totalLen <= 512
            ? stackalloc byte[totalLen]
            : (rented = System.Buffers.ArrayPool<byte>.Shared.Rent(totalLen)).AsSpan(0, totalLen);

        try
        {
            BinaryPrimitives.WriteInt64BigEndian(canonical[..sizeof(long)], unixTimestampSeconds);
            canonical[sizeof(long)] = (byte)'.';
            payload.CopyTo(canonical[(sizeof(long) + 1)..]);

            HMACSHA256.HashData(_signingKey, canonical, destination);
        }
        finally
        {
            if (rented is not null)
            {
                CryptographicOperations.ZeroMemory(canonical);
                System.Buffers.ArrayPool<byte>.Shared.Return(rented);
            }
        }
    }
}
