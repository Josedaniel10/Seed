import type { Profile, Request, SessionAttendance } from '../../types/database.ts';
import { normalizeRole } from '../../lib/permissions.ts';

interface RequestQuorumInput {
  request: Request;
  attendance: SessionAttendance[];
  members: Profile[];
  requiredCount: number;
}

export interface RequestQuorum {
  hasQuorum: boolean;
  eligibleCount: number;
  requiredCount: number;
  excludedParticipants: Array<{ id: string; name: string; reason: string }>;
}

export function getRequestQuorum({ request, attendance, members, requiredCount }: RequestQuorumInput): RequestQuorum {
  const profiles = new Map(members.map((member) => [member.id, member]));
  const excludedParticipants: RequestQuorum['excludedParticipants'] = [];
  let eligibleCount = 0;

  for (const participant of attendance.filter((entry) => entry.attended)) {
    const member = profiles.get(participant.user_id);
    const hasCommitteeRole = member?.is_active && [member.role, ...(member.roles ?? [])]
      .some((role) => ['committee_member', 'secretary'].includes(normalizeRole(role)));
    let reason = '';
    if (!hasCommitteeRole) {
      reason = 'Su cuenta está inactiva o no tiene un rol de participación en el comité.';
    } else if (member.id === request.applicant_id) {
      reason = 'Es la persona que presentó la solicitud.';
    } else if (request.research_group_id && member.research_group_id === request.research_group_id) {
      reason = 'Pertenece al mismo grupo de investigación de la solicitud.';
    }
    if (reason) {
      excludedParticipants.push({ id: participant.user_id, name: participant.user_name, reason });
    } else {
      eligibleCount += 1;
    }
  }

  return { hasQuorum: eligibleCount >= requiredCount, eligibleCount, requiredCount, excludedParticipants };
}
