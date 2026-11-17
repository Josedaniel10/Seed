import 'dotenv/config';
import fs from 'node:fs/promises';
import pg from 'pg';

const migrationNames = ['20261116000001_catalog_templates'];
const target = new URL(process.env.DATABASE_URL);
const projectRef = new URL(process.env.VITE_SUPABASE_URL).hostname.split('.')[0];
if (target.hostname !== `db.${projectRef}.supabase.co` && decodeURIComponent(target.username) !== `postgres.${projectRef}`) {
  throw new Error('DATABASE_URL debe corresponder al proyecto de la aplicación.');
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 30000 });
try {
  await db.connect();
  await db.query('BEGIN');
  for (const migrationName of migrationNames) {
    const version = migrationName.split('_')[0];
    const exists = await db.query('SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=$1', [version]);
    if (exists.rowCount) continue;
    const migration = await fs.readFile(`supabase/migrations/${migrationName}.sql`, 'utf8');
    await db.query(migration.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
    if (process.argv.includes('--apply')) {
      await db.query('INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ($1,$2,$3)',
        [version, migrationName.slice(version.length + 1), [migration]]);
    }
  }
  if (process.argv.includes('--apply')) {
    await db.query('COMMIT');
    console.log('Verified migrations installed: catalog_templates');
  } else {
    const tests = await fs.readFile('supabase/tests/catalog_templates.sql', 'utf8');
    await db.query(tests.replace(/^BEGIN;\s*/, ''));
    console.log('Passed (rollback): catalog persistence, permissions, deletion, frozen requirements and templates');
  }
} catch (error) {
  await db.query('ROLLBACK').catch(() => {});
  console.error('Catalog database verification failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
