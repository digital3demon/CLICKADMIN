import { describe, expect, it } from "vitest";
import { applyMailRules, mailRuleMatches } from "@/lib/mail-rules";

const message = {
  fromText: "Doctor <doctor@example.com>",
  toText: "main@digitaldemon.studio",
  subject: "Новый заказ 2605-060",
  textBody: "Просьба принять заказ в работу",
};

describe("mail rules", () => {
  it("matches by subject and applies labels, importance and CRM folder", () => {
    const rule = {
      id: "r1",
      name: "Заказы",
      conditions: { subjectContains: "заказ" },
      actions: { labels: ["Заказ"], important: true, crmFolder: "orders" },
    };
    expect(mailRuleMatches(rule, message)).toBe(true);
    expect(applyMailRules([rule], message)).toMatchObject({
      labels: ["Заказ"],
      isImportant: true,
      crmFolder: "orders",
      ruleLog: [{ ruleId: "r1", name: "Заказы" }],
    });
  });

  it("keeps every mailbox rule independent by only applying provided rules", () => {
    const firstMailboxRule = {
      id: "r1",
      name: "Main orders",
      conditions: { subjectContains: "заказ" },
      actions: { labels: ["Main"] },
    };
    const otherMailboxRule = {
      id: "r2",
      name: "Other mailbox",
      conditions: { subjectContains: "заказ" },
      actions: { labels: ["Other"] },
    };
    expect(applyMailRules([firstMailboxRule], message).labels).toEqual(["Main"]);
    expect(applyMailRules([otherMailboxRule], message).labels).toEqual(["Other"]);
  });
});
