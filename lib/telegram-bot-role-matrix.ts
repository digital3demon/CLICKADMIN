import { UserRole } from "@prisma/client";

const SHIP_COMMAND_ROLES = new Set<UserRole>([
  UserRole.SENIOR_ADMINISTRATOR,
  UserRole.ADMINISTRATOR,
  UserRole.SENIOR_TECHNICIAN,
  UserRole.MANAGER,
  UserRole.OWNER,
]);

/** Лабораторный срок наряда (Order.dueDate) — админы и владелец. */
const LAB_DLINE_ROLES = new Set<UserRole>([
  UserRole.ADMINISTRATOR,
  UserRole.SENIOR_ADMINISTRATOR,
  UserRole.OWNER,
]);

/** Этапный срок карточек канбана, где пользователь ответственный или участник. */
const PERSONAL_CARD_DLINE_ROLES = new Set<UserRole>([
  UserRole.SENIOR_TECHNICIAN,
  UserRole.PRODUCTION,
  UserRole.SENIOR_PRODUCTION,
  UserRole.MANAGER,
  UserRole.USER,
]);

export function telegramRoleMayShip(role: UserRole): boolean {
  return SHIP_COMMAND_ROLES.has(role);
}

export function telegramRoleUsesLabOrderDline(role: UserRole): boolean {
  return LAB_DLINE_ROLES.has(role);
}

export function telegramRoleUsesPersonalCardStageDline(role: UserRole): boolean {
  return PERSONAL_CARD_DLINE_ROLES.has(role);
}

export function telegramRoleMayCardStageDline(role: UserRole): boolean {
  return role === UserRole.OWNER;
}

export function telegramRoleMayDline(role: UserRole): boolean {
  return (
    telegramRoleUsesLabOrderDline(role) ||
    telegramRoleUsesPersonalCardStageDline(role)
  );
}
