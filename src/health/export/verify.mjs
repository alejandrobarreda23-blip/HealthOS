#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HASH_ALGORITHM = "sha256";
const CANONICALIZATION = "healthos-canonical-json-v1-ecmascript";

function assertJsonSafeScalar(value, path) {
  if (value === undefined) throw new Error(`Undefined at ${path}`);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number at ${path}`);
    if (Object.is(value, -0)) throw new Error(`Negative zero at ${path}`);
  }
  if (["bigint", "symbol", "function"].includes(typeof value)) {
    throw new Error(`Non-JSON value at ${path}`);
  }
}

function canonicalize(value, path = "$") {
  assertJsonSafeScalar(value, path);
  if (Array.isArray(value)) {
    return value.map((item, i) => canonicalize(item, `${path}[${i}]`));
  }
  if (value && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error(`Non-plain object at ${path}`);
    }
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [
        key,
        canonicalize(value[key], `${path}.${key}`),
      ]),
    );
  }
  return value;
}

function canonicalJson(value) {
  const s = JSON.stringify(canonicalize(value));
  if (typeof s !== "string") throw new Error("Root is not canonical JSON");
  return s;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(process.argv[2] ?? here);
  const manifestPath = join(root, "manifest.json");
  const rawManifest = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(rawManifest);

  if (manifest.hash_algorithm !== HASH_ALGORITHM) {
    throw new Error(`Unsupported hash_algorithm: ${manifest.hash_algorithm}`);
  }
  if (manifest.canonicalization !== CANONICALIZATION) {
    throw new Error(`Unsupported canonicalization: ${manifest.canonicalization}`);
  }

  const withoutSelfHash = { ...manifest };
  delete withoutSelfHash.manifest_sha256;
  const computedManifestHash = sha256(
    Buffer.from(canonicalJson(withoutSelfHash), "utf8"),
  );
  if (computedManifestHash !== manifest.manifest_sha256) {
    throw new Error(
      `Manifest hash mismatch: expected ${manifest.manifest_sha256}, got ${computedManifestHash}`,
    );
  }

  let verified = 0;
  for (const entry of manifest.files ?? []) {
    if (entry.status === "not_available") continue;

    const path = join(root, entry.path);
    const bytes = await readFile(path);
    const meta = await stat(path);

    if (meta.size !== entry.bytes) {
      throw new Error(`${entry.path}: byte-size mismatch`);
    }
    const digest = sha256(bytes);
    if (digest !== entry.sha256) {
      throw new Error(`${entry.path}: sha256 mismatch`);
    }

    if (
      entry.record_count !== null &&
      entry.media_type === "application/x-ndjson"
    ) {
      const text = bytes.toString("utf8");
      const count = text.length === 0
        ? 0
        : text.split("\n").filter((line) => line.length > 0).length;
      if (count !== entry.record_count) {
        throw new Error(
          `${entry.path}: record_count mismatch (${count} != ${entry.record_count})`,
        );
      }
    }

    verified += 1;
  }

  console.log(
    `HealthOS archive verified: ${verified} files; manifest ${computedManifestHash}`,
  );
}

main().catch((error) => {
  console.error(`VERIFY FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
