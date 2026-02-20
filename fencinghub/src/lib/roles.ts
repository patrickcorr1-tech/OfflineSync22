export type Role = "admin" | "sales" | "contractor" | "customer";

export function canEdit(role?: Role) {
  return role === "admin" || role === "sales";
}

export function canWriteProject(role?: Role) {
  return role === "admin" || role === "sales" || role === "contractor";
}
