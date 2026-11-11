import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMinutePdf } from '../minutePdf.ts';

test('exports paginated PDF minutes with Spanish text and draft status', async () => {
  const minute = {
    id: 'test', minute_number: 'Acta 001 de 2028', year: 2028, session_id: 'session',
    draft_content: 'Fundamento técnico, investigación y decisión. ÁÉÍÓÚ ñ\n'.repeat(150),
    is_approved: false, approved_at: null, pdf_path: null, created_at: '2028-01-01T12:00:00Z',
  };
  const blob = createMinutePdf(minute);
  assert.equal(blob.type, 'application/pdf');
  const content = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  assert.ok(content.startsWith('%PDF-'));
  assert.ok(content.endsWith('%%EOF'));
  assert.ok((content.match(/\/Type \/Page\b/g) ?? []).length >= 3);
  assert.match(content, /Borrador para revisión/);
  assert.match(content, /Fundamento técnico/);
  assert.match(content, /Página 1 de/);
});
