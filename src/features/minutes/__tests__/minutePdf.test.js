import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMinutePdf } from '../minutePdf.ts';
import { executiveMinute } from './minutePdfFixtures.js';
import { createMinuteContent, serializeMinuteContent } from '../minuteContent.ts';

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

test('renders controlled narrative, closing time, deadlines and named signature cards', async () => {
  const minute = { ...executiveMinute(), is_approved: false, approved_at: null };
  const content = createMinuteContent(minute);
  const editorial = { ...content.editorial, closingTime: '11:30', observations: 'Observaciones del formulario',
    signatories: [{ name: 'Ana María Peña', role: 'Presidenta del comité' }, { name: 'Patricia Salamanca', role: 'Secretaria técnica' }, { name: 'José Ramírez', role: 'Revisor invitado' }],
    commitments: [{ action: 'Revisar anexos', responsible: 'Secretaría técnica', responsibleUserId: '', deadlineType: 'next_session', deadline: '' }],
  };
  editorial.topicNotes[0].text = 'Desarrollo complementario revisado por el comité.';
  const blob = createMinutePdf({ ...minute, draft_content: serializeMinuteContent(content, editorial) });
  const pdf = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  for (const label of ['Cierre 11:30', 'Observaciones del formulario', 'Desarrollo complementario', 'Ana María Peña', 'Revisor invitado', 'Próxima sesión']) {
    assert.ok(pdf.includes(label), `Missing ${label}`);
  }
  assert.ok(!pdf.includes('seed.committee-minute'));
});

test('downloads structured executive minutes through the existing Blob API', async () => {
  const minute = executiveMinute();
  const originalContent = minute.draft_content;
  const blob = createMinutePdf(minute);
  const content = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  assert.equal(blob.type, 'application/pdf');
  for (const label of ['Acta de sesión', 'Asistentes', 'Orden del día', 'Compromisos y responsables', 'Firmas', 'Nombre y firma']) {
    assert.ok(content.includes(label), `Missing ${label}`);
  }
  assert.match(content, /Acta aprobada/);
  assert.match(content, /Andrés Muñoz/);
  assert.match(content, /23\/11\/2026/);
  assert.match(content, /No deliberada por falta de quórum/);
  assert.equal(minute.draft_content, originalContent);
});
