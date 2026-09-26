export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  exp: number; // Unix timestamp in seconds
}

export const SESSION_COOKIE_NAME = "repopilot_session";
const DEFAULT_SECRET = "repopilot-2.0-dev-session-secret-key-32chars";

function getSecretKey(): string {
  return process.env.AUTH_SECRET || DEFAULT_SECRET;
}

/**
 * Base64URL encode/decode helpers
 */
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return atob(base64);
}

/**
 * Sign a string with HMAC-SHA256 using Web Crypto API (supported in Edge & Node.js)
 */
async function signHmac(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(signature));
  const rawString = String.fromCharCode(...hashArray);
  return base64UrlEncode(rawString);
}

/**
 * Create a signed session JWT token valid for 7 days
 */
export async function createSessionToken(user: { id: string; email: string; name?: string | null }): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email.toLowerCase().trim(),
    name: user.name || user.email.split("@")[0],
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHmac(dataToSign, getSecretKey());

  return `${dataToSign}.${signature}`;
}

/**
 * Verify and decode a session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await signHmac(dataToSign, getSecretKey());

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
