#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(process.argv[2] ?? ".");
const expected = (await readFile(resolve(repoRoot, "MIGRATIONS_HEAD"), "utf8")).trim();
const dir = resolve(repoRoot, "supabase/migrations");
const names = await readdir(dir);

const numbered = names
  .map((name) => {
    const match = name.match(/^(\d{3})_/);
    return match ? { head: match[1], name } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.head.localeCompare(b.head));

if (numbered.length === 0) {
  throw new Error("No numbered migrations found");
}

const actual = numbered.at(-1).head;
if (actual !== expected) {
  throw new Error(`Migration head drift: MIGRATIONS_HEAD=${expected}, repo=${actual}`);
}

const production = process.env.HEALTHOS_PRODUCTION_MIGRATIONS_HEAD;
if (production && production !== expected) {
  throw new Error(
    `Production migration drift: production=${production}, repo-contract=${expected}`,
  );
}

console.log(`Migration head OK: ${expected}`);
