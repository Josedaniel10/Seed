import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'catalog-persistence-test-key';
const { useCatalogStore } = await import('../catalogStore.ts');
const { requirementsForRequest } = await import('../catalogSnapshot.ts');
const { uploadTemplate } = await import('../templateFiles.ts');
const initial = useCatalogStore.getState();
const originalFetch = globalThis.fetch;
const type = { id: 'type', code: 'CODE', name: 'Trámite', description: null, requires_committee: true, is_active: true, display_order: 1, created_at: '2026-11-16' };
const requirement = { id: 'req', application_type_id: 'type', name: 'Requisito', description: null, is_mandatory: true, is_subsanable: true,
  allowed_formats: ['application/pdf'], max_size_mb: 5, template_url: null, cure_deadline_days: 5, is_active: true, created_at: '2026-11-16' };
afterEach(() => { useCatalogStore.setState(initial); globalThis.fetch = originalFetch; });

test('catalog does not change locally before Supabase confirms a mutation, and failures preserve state', async () => {
  useCatalogStore.setState({ types: [type], requirements: [requirement] });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  globalThis.fetch = async (input, options) => {
    assert.ok(String(input).endsWith('/rpc/manage_catalog'));
    assert.equal(JSON.parse(options.body).p_action, 'TYPE_UPDATE');
    await gate;
    return Response.json({ message: 'Permiso denegado' }, { status: 403 });
  };
  const pending = initial.updateType('type', { name: 'Otro nombre' });
  assert.equal(useCatalogStore.getState().types[0].name, 'Trámite');
  release();
  assert.equal((await pending).success, false);
  assert.equal(useCatalogStore.getState().types[0].name, 'Trámite');
});

test('linked requirement removal reflects server archival and preserves original requirement records', async () => {
  useCatalogStore.setState({ types: [type], requirements: [requirement] });
  globalThis.fetch = async () => Response.json({ type: null, requirement: { ...requirement, is_active: false }, deleted: false });
  assert.equal((await initial.removeRequirement('req')).success, true);
  assert.equal(useCatalogStore.getState().requirements.length, 1);
  assert.equal(useCatalogStore.getState().requirements[0].is_active, false);
});

test('empty remote catalog clears old local entries and historical snapshots use original requirements', async () => {
  globalThis.fetch = async () => Response.json([]);
  useCatalogStore.setState({ types: [type], requirements: [requirement] });
  assert.equal((await initial.loadFromSupabase()).success, true);
  assert.deepEqual(useCatalogStore.getState().types, []);
  const request = { application_type_id: 'type', catalog_snapshot: { type, requirements: [requirement] } };
  const current = [{ ...requirement, name: 'Modificado', max_size_mb: 10, is_active: false }, { ...requirement, id: 'new' }];
  assert.deepEqual(requirementsForRequest(request, current), [requirement]);
  assert.equal(requirementsForRequest({ application_type_id: 'type' }, current).length, 1);
});

test('template validation rejects empty, oversized, executable and disguised content before upload', async () => {
  for (const file of [new File([], 'empty.pdf'), new File(['executable'], 'program.exe'), new File(['plain text'], 'fake.docx'),
    { name: 'huge.xlsx', size: 11 * 1048576 }]) {
    await assert.rejects(uploadTemplate(file));
  }
});
