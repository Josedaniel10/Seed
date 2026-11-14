// Validate migration and authorization inside a rollback, or apply the verified migration.
import 'dotenv/config';
import fs from 'node:fs/promises';
import pg from 'pg';

const migrationNames = ['20261113000001_private_document_files', '20261113000002_guard_document_correction_audit'];
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('Configure DATABASE_URL para comprobar las políticas de documentos.');
const target = new URL(connectionString);
const projectRef = new URL(process.env.VITE_SUPABASE_URL).hostname.split('.')[0];
if (target.hostname !== `db.${projectRef}.supabase.co` && decodeURIComponent(target.username) !== `postgres.${projectRef}`) {
  throw new Error('DATABASE_URL debe corresponder al proyecto de la aplicación.');
}
const db = new pg.Client({ connectionString, connectionTimeoutMillis: 10000, statement_timeout: 30000 });
try {
  await db.connect();
  if (process.argv.includes('--installed')) {
    for (const name of ['private_document_files','atomic_filing','request_lifecycle','persist_request_validation','documentary_validation_queue','committee_workflow']) {
      await db.query(await fs.readFile(`supabase/tests/${name}.sql`, 'utf8'));
      console.log(`Passed (rollback): ${name}`);
    }
  } else {
    await db.query('BEGIN');
    for (const migrationName of migrationNames) {
      const version = migrationName.split('_')[0];
      const exists = await db.query('SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=$1', [version]);
      if (exists.rowCount) continue;
      const migration = await fs.readFile(`supabase/migrations/${migrationName}.sql`, 'utf8');
      await db.query(migration.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
      if (process.argv.includes('--apply')) {
        await db.query(`INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
          VALUES ($1,$2,$3)`, [version,migrationName.slice(version.length + 1),[migration]]);
        console.log(`Applied: ${migrationName}`);
      }
    }
    if (process.argv.includes('--apply')) {
      await db.query('COMMIT');
    } else {
      const tests = await fs.readFile('supabase/tests/private_document_files.sql', 'utf8');
      await db.query(tests.replace(/^BEGIN;\s*/, ''));
      console.log('Passed: private files, assigned reviewer access, revoked access, correction concurrency and rollback');
    }
  }
} catch (error) {
  await db.query('ROLLBACK').catch(() => {});
  console.error('Document database verification failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
