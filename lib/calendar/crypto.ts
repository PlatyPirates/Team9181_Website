import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// AES-256-GCM for secrets we must be able to show again (personal feed
// tokens now, Google refresh tokens in v1.1). The key lives outside the
// database: CALENDAR_ENC_KEY (32 bytes, base64). Until it is set we derive a
// key from the service-role key so v1 works with no new env var; set
// CALENDAR_ENC_KEY before turning on Google sync.
function key(): Buffer {
  const k = process.env.CALENDAR_ENC_KEY;
  if (k) {
    const buf = Buffer.from(k, "base64");
    if (buf.length !== 32) throw new Error("CALENDAR_ENC_KEY must be 32 bytes, base64-encoded.");
    return buf;
  }
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc) throw new Error("Set CALENDAR_ENC_KEY (or SUPABASE_SERVICE_ROLE_KEY).");
  return createHash("sha256").update(`platy-calendar:${svc}`).digest();
}

const b64u = (b: Buffer) => b.toString("base64url");

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1:${b64u(iv)}:${b64u(c.getAuthTag())}:${b64u(ct)}`;
}

export function decrypt(blob: string): string | null {
  try {
    const [v, iv, tag, ct] = blob.split(":");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function newFeedToken(): string {
  return b64u(randomBytes(32));
}

/** Google sync stores refresh tokens, so it needs a real key (not the derived fallback). */
export function hasExplicitKey(): boolean {
  try {
    return Buffer.from(process.env.CALENDAR_ENC_KEY ?? "", "base64").length === 32;
  } catch {
    return false;
  }
}

export function randomToken(bytes = 32): string {
  return b64u(randomBytes(bytes));
}
