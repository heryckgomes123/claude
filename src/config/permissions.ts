/**
 * RBAC do Command Center.
 * A matriz é a fonte única de verdade. Ela é aplicada no SERVIDOR (services/actions/páginas);
 * a interface apenas a consulta para esconder o que o usuário não pode usar.
 */

export const ROLES = ["OWNER", "MANAGER", "RECEPTION", "PROFESSIONAL"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Proprietária",
  MANAGER: "Gerente",
  RECEPTION: "Recepção",
  PROFESSIONAL: "Profissional",
};

export const PERMISSIONS = [
  "dashboard.view",
  "dashboard.financial",

  "appointments.view",
  "appointments.view_all",
  "appointments.create",
  "appointments.edit",
  "appointments.cancel",
  "appointments.status",

  "schedule_blocks.manage",

  "clients.view",
  "clients.view_all",
  "clients.create",
  "clients.edit",
  "clients.deactivate",

  "professionals.view",
  "professionals.view_all",
  "professionals.manage",

  "services.view",
  "services.create",
  "services.edit",

  "attendance.view",
  "attendance.view_all",
  "attendance.create",
  "attendance.finish",
  "attendance.discount",

  "payments.create",

  "finance.view",

  "commissions.view",
  "commissions.view_own",
  "commissions.manage",

  "cash.view",
  "cash.manage",

  "inventory.view",
  "inventory.manage",

  "settings.view",
  "settings.company",
  "settings.schedule",
  "users.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS] as Permission[];

const MATRIX: Record<Role, readonly Permission[]> = {
  OWNER: ALL,
  MANAGER: ALL.filter((p) => p !== "users.manage" && p !== "settings.company"),
  RECEPTION: [
    "dashboard.view",
    "appointments.view",
    "appointments.view_all",
    "appointments.create",
    "appointments.edit",
    "appointments.cancel",
    "appointments.status",
    "schedule_blocks.manage",
    "clients.view",
    "clients.view_all",
    "clients.create",
    "clients.edit",
    "professionals.view",
    "professionals.view_all",
    "services.view",
    "attendance.view",
    "attendance.view_all",
    "attendance.create",
    "attendance.finish",
    "attendance.discount",
    "payments.create",
    "cash.view",
    "cash.manage",
    "inventory.view",
  ],
  PROFESSIONAL: [
    "dashboard.view",
    "appointments.view", // somente a própria agenda
    "clients.view", // somente clientes atendidas por ela
    "professionals.view", // somente o próprio perfil
    "services.view",
    "attendance.view", // somente os próprios atendimentos
    "attendance.create",
    "attendance.finish",
    "commissions.view_own",
  ],
};

const MATRIX_SETS: Record<Role, ReadonlySet<Permission>> = {
  OWNER: new Set(MATRIX.OWNER),
  MANAGER: new Set(MATRIX.MANAGER),
  RECEPTION: new Set(MATRIX.RECEPTION),
  PROFESSIONAL: new Set(MATRIX.PROFESSIONAL),
};

export function roleCan(role: Role, permission: Permission): boolean {
  return MATRIX_SETS[role]?.has(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return [...MATRIX[role]];
}

/** Rota inicial após login, por perfil. */
export function homePathFor(role: Role): string {
  return role === "PROFESSIONAL" ? "/painel/agenda" : "/painel";
}
