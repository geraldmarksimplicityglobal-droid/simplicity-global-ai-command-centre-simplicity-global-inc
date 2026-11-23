export function isUuid(value) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Resolve the caller's membership without widening legal-entity scope.
 * An organisation-wide membership (legal_entity_id = null) can access a
 * selected entity; an entity-only membership must name that exact entity.
 * Entity-scoped access is disabled for domains whose tables do not yet carry
 * legal_entity_id.
 */
export function selectMembership(memberships, organisationId, legalEntityId, allowEntityScope = false) {
  if (!Array.isArray(memberships)) return null;
  const candidates = memberships.filter(m => m.organisation_id === organisationId);
  if (legalEntityId) {
    if (!allowEntityScope) return null;
    return candidates.find(m => m.legal_entity_id === legalEntityId) ??
      candidates.find(m => m.legal_entity_id === null) ?? null;
  }
  return candidates.find(m => m.legal_entity_id === null) ?? null;
}

export function hasPermission(membership, permission) {
  return Boolean(membership &&
    Array.isArray(membership.permissions) &&
    (membership.permissions.includes(permission) || membership.permissions.includes("*")));
}
