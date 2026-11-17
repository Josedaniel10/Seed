import type { Request, Requirement } from '../../types/database.ts';

export function requirementsForRequest(request: Request, current: Requirement[]): Requirement[] {
  return request.catalog_snapshot?.requirements ?? current.filter(requirement => requirement.is_active !== false
    && (requirement.application_type_id ?? requirement.request_type_id) === (request.application_type_id ?? request.request_type_id));
}
