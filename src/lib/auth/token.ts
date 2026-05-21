import { serverEnv } from "@/lib/env/server.env";

async function getKey(env: Env): Promise<CryptoKey> {
  const secret = serverEnv(env).JWT_SECRET || "fallback-dev-secret";
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

export async function createPostAccessToken(
  env: Env,
  slug: string,
  expiresInMinutes = 30
): Promise<string> {
  const key = await getKey(env);
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const payload = { slug, iat: now, exp: now + expiresInMinutes * 60 };
  const header = { alg: "HS256", typ: "JWT" };
  const headerEnc = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadEnc = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const toSign = `${headerEnc}.${payloadEnc}`;
  const sig = await crypto.subtle.sign({ name: "HMAC" }, key, enc.encode(toSign));
  return `${headerEnc}.${payloadEnc}.${base64UrlEncode(sig)}`;
}

export async function verifyToken(
  env: Env,
  token: string
): Promise<{ slug: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerEnc, payloadEnc, sigEnc] = parts;
    const key = await getKey(env);
    const enc = new TextEncoder();
    const toVerify = `${headerEnc}.${payloadEnc}`;
    const sig = base64UrlDecode(sigEnc);
    const valid = await crypto.subtle.verify({ name: "HMAC" }, key, sig, enc.encode(toVerify));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadEnc)));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return typeof payload.slug === "string" ? { slug: payload.slug } : null;
  } catch {
    return null;
  }
}