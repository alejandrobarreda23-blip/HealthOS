export const HEALTHOS_HASH_ALGORITHM = "sha256" as const;
export const HEALTHOS_CANONICALIZATION =
  "healthos-canonical-json-v1-ecmascript" as const;

const CREDENTIAL_FIELD_DENYLIST = new Set([
  "access_token",
  "refresh_token",
  "authorization",
  "cookie",
  "password",
  "secret",
  "private_key",
  "supabase_service_role_key",
  "intervals_api_key",
  "api_key",
  "apikey",
  "x-api-key",
  "client_secret",
  "bearer_token",
  "id_token",
  "session_token",
]);

export interface RedactionRecord {
  jsonPath: string;
  rule: "credential-denylist-v1";
}

function assertJsonSafeScalar(value: unknown, path: string): void {
  if (value === undefined) {
    throw new Error(`Undefined at ${path} cannot be exported without information loss`);
  }

  if (
    typeof value === "bigint" ||
    typeof value === "symbol" ||
    typeof value === "function"
  ) {
    throw new Error(
      `Non-JSON value (${typeof value}) at ${path} cannot be exported`,
    );
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        `Non-finite number at ${path} cannot be canonicalized (JSON would serialize it as null)`,
      );
    }
    if (Object.is(value, -0)) {
      throw new Error(
        `Negative zero at ${path} cannot be canonicalized losslessly`,
      );
    }
  }
}

function assertPlainObject(value: object, path: string): void {
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error(
      `Non-plain object at ${path} cannot be exported losslessly`,
    );
  }
}

export function sanitizeForExport(
  value: unknown,
  path = "$",
  redactions: RedactionRecord[] = [],
): { value: unknown; redactions: RedactionRecord[] } {
  assertJsonSafeScalar(value, path);

  if (Array.isArray(value)) {
    return {
      value: value.map((item, i) =>
        sanitizeForExport(item, `${path}[${i}]`, redactions).value
      ),
      redactions,
    };
  }

  if (value && typeof value === "object") {
    assertPlainObject(value, path);

    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const normalized = key.toLowerCase();
      const childPath = `${path}.${key}`;

      if (CREDENTIAL_FIELD_DENYLIST.has(normalized)) {
        redactions.push({
          jsonPath: childPath,
          rule: "credential-denylist-v1",
        });
        continue;
      }

      out[key] = sanitizeForExport(child, childPath, redactions).value;
    }

    return { value: out, redactions };
  }

  return { value, redactions };
}

/**
 * HealthOS Canonical JSON V1
 *
 * Data model:
 * - JSON primitives, arrays and plain objects only
 * - finite numbers only
 * - negative zero rejected because JSON.stringify would serialize it as 0
 * - object keys sorted recursively by ECMAScript string ordering
 * - strings/numbers serialized with ECMAScript JSON.stringify semantics
 * - no whitespace
 *
 * This is intentionally identified in the manifest. It is not claimed to be
 * RFC 8785/JCS. Every archive ships with verify.mjs implementing the same
 * semantics so future verification does not depend on undocumented behavior.
 */
function canonicalize(value: unknown, path = "$"): unknown {
  assertJsonSafeScalar(value, path);

  if (Array.isArray(value)) {
    return value.map((item, i) => canonicalize(item, `${path}[${i}]`));
  }

  if (value && typeof value === "object") {
    assertPlainObject(value, path);
    const obj = value as Record<string, unknown>;

    return Object.fromEntries(
      Object.keys(obj)
        .sort()
        .map((key) => [key, canonicalize(obj[key], `${path}.${key}`)]),
    );
  }

  return value;
}

export function canonicalJson(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value));
  if (typeof serialized !== "string") {
    throw new Error("Root value cannot be represented as canonical JSON");
  }
  return serialized;
}

export function toNdjson(rows: unknown[]): string {
  return rows.map((row) => canonicalJson(row)).join("\n") +
    (rows.length ? "\n" : "");
}
