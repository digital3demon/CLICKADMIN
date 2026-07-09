import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  telegramRoleMayCardStageDline,
  telegramRoleMayDline,
  telegramRoleMayShip,
  telegramRoleUsesLabOrderDline,
  telegramRoleUsesPersonalCardStageDline,
} from "@/lib/telegram-bot-role-matrix";

describe("telegram bot role matrix", () => {
  it("владелец: отгрузки, лаб. срок и срок всех карточек", () => {
    expect(telegramRoleMayShip(UserRole.OWNER)).toBe(true);
    expect(telegramRoleUsesLabOrderDline(UserRole.OWNER)).toBe(true);
    expect(telegramRoleUsesPersonalCardStageDline(UserRole.OWNER)).toBe(false);
    expect(telegramRoleMayCardStageDline(UserRole.OWNER)).toBe(true);
    expect(telegramRoleMayDline(UserRole.OWNER)).toBe(true);
  });

  it("админ: отгрузки и лаб. срок, без срока карточек", () => {
    expect(telegramRoleMayShip(UserRole.ADMINISTRATOR)).toBe(true);
    expect(telegramRoleUsesLabOrderDline(UserRole.ADMINISTRATOR)).toBe(true);
    expect(telegramRoleMayCardStageDline(UserRole.ADMINISTRATOR)).toBe(false);
    expect(telegramRoleMayDline(UserRole.ADMINISTRATOR)).toBe(true);
  });

  it("пользователь канбана: этапный срок своих карточек, без отгрузок", () => {
    expect(telegramRoleMayShip(UserRole.USER)).toBe(false);
    expect(telegramRoleUsesPersonalCardStageDline(UserRole.USER)).toBe(true);
    expect(telegramRoleUsesLabOrderDline(UserRole.USER)).toBe(false);
    expect(telegramRoleMayCardStageDline(UserRole.USER)).toBe(false);
    expect(telegramRoleMayDline(UserRole.USER)).toBe(true);
  });
});
