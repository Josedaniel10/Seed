import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getRequestQuorum } from '../requestQuorum.ts';

const request = { applicant_id: 'owner', research_group_id: 'nanomaterials' };
const members = [
  { id: 'reviewer', role: 'integrante_comite', is_active: true, research_group_id: 'nanomaterials' },
  { id: 'secretary', role: 'secretario', is_active: true, research_group_id: 'social-research' },
];
const attendance = [
  { user_id: 'reviewer', user_name: 'Alejandro', attended: true },
  { user_id: 'secretary', user_name: 'Patricia', attended: true },
];

test('shows why general attendance can satisfy quorum while a specific request cannot be decided', () => {
  const blocked = getRequestQuorum({ request, members, attendance, requiredCount: 2 });
  assert.equal(blocked.hasQuorum, false);
  assert.equal(blocked.eligibleCount, 1);
  assert.deepEqual(blocked.excludedParticipants, [{
    id: 'reviewer', name: 'Alejandro', reason: 'Pertenece al mismo grupo de investigación de la solicitud.',
  }]);

  const eligible = getRequestQuorum({
    request: { ...request, research_group_id: 'biotechnology' }, members, attendance, requiredCount: 2,
  });
  assert.equal(eligible.hasQuorum, true);
  assert.equal(eligible.eligibleCount, 2);
  assert.deepEqual(eligible.excludedParticipants, []);
});

test('excludes request owners and inactive or absent members without treating null groups as a conflict', () => {
  const result = getRequestQuorum({
    request: { applicant_id: 'reviewer', research_group_id: null },
    members: [...members, { id: 'inactive', role: 'committee_member', is_active: false }],
    attendance: [...attendance,
      { user_id: 'inactive', user_name: 'Cuenta inactiva', attended: true },
      { user_id: 'absent', user_name: 'Ausente', attended: false }],
    requiredCount: 2,
  });
  assert.equal(result.eligibleCount, 1);
  assert.equal(result.excludedParticipants.length, 2);
  assert.match(result.excludedParticipants[0].reason, /presentó la solicitud/);
  assert.match(result.excludedParticipants[1].reason, /inactiva/);
});
