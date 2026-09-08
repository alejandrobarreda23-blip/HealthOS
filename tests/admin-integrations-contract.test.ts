import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('admin integrations security contract', () => {
  const migration = fs.readFileSync(
    path.resolve('supabase/migrations/026_admin_integrations_v1.sql'),
    'utf8',
  );

  it('stores credentials by Vault reference rather than plaintext API-key column', () => {
    expect(migration).toContain('credential_secret_id');
    expect(migration).toContain('vault.create_secret');
    // The RPC accepts api_key as an input before storing it in Vault. Check storage, not parameters.
    const table = migration.slice(migration.indexOf('create table'), migration.indexOf('create index'));
    expect(table).toContain('public.subject_integrations');
    expect(table).toContain('credential_secret_id');
    expect(table).not.toMatch(/\bapi_key\s+text\b/i);
  });

  it('requires admin for credential mutation', () => {
    expect(migration).toContain('not public.is_admin()');
    expect(migration).toContain("'ADMIN_REQUIRED'");
  });

  it('audits passive-source administration', () => {
    expect(migration).toContain("'configure_source'");
    expect(migration).toContain("'sync_source'");
    expect(migration).toContain("'disable_source'");
  });
});
