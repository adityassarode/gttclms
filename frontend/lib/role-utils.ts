export function normalizeRole(role?: string | null) {
  return (role || "").trim().toUpperCase();
}

export function isAdminRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized === "ADMIN" || normalized === "ROLE_ADMIN";
}

export function isUserRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized === "USER" || normalized === "ROLE_USER";
}
