import type { Prisma } from "@prisma/client";

export type MailRuleCondition = {
  fromContains?: string;
  toContains?: string;
  subjectContains?: string;
  bodyContains?: string;
};

export type MailRuleAction = {
  labels?: string[];
  assignUserId?: string;
  important?: boolean;
  crmFolder?: string;
  autoReply?: { subject: string; body: string };
};

export type MailRuleConfig = {
  conditions: MailRuleCondition;
  actions: MailRuleAction;
};

export type MailRuleInput = {
  id: string;
  name: string;
  conditions: Prisma.JsonValue;
  actions: Prisma.JsonValue;
};

export type MailRuleMessageInput = {
  fromText: string;
  toText?: string | null;
  subject?: string | null;
  textBody?: string | null;
};

export type AppliedMailRules = {
  labels: string[];
  assignedUserId: string | null;
  isImportant: boolean;
  crmFolder: string | null;
  autoReply: { ruleId: string; subject: string; body: string } | null;
  ruleLog: Array<{ ruleId: string; name: string; actions: MailRuleAction }>;
};

function asObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
}

export function parseMailRuleConfig(rule: MailRuleInput): MailRuleConfig {
  const c = asObject(rule.conditions);
  const a = asObject(rule.actions);
  const auto = asObject(a.autoReply as Prisma.JsonValue);
  const autoSubject = stringValue(auto.subject);
  const autoBody = stringValue(auto.body);
  return {
    conditions: {
      fromContains: stringValue(c.fromContains),
      toContains: stringValue(c.toContains),
      subjectContains: stringValue(c.subjectContains),
      bodyContains: stringValue(c.bodyContains),
    },
    actions: {
      labels: stringArray(a.labels),
      assignUserId: stringValue(a.assignUserId),
      important: typeof a.important === "boolean" ? a.important : undefined,
      crmFolder: stringValue(a.crmFolder),
      autoReply: autoSubject && autoBody ? { subject: autoSubject, body: autoBody } : undefined,
    },
  };
}

function includes(haystack: string | null | undefined, needle: string | undefined): boolean {
  if (!needle) return true;
  return (haystack ?? "").toLocaleLowerCase("ru-RU").includes(needle.toLocaleLowerCase("ru-RU"));
}

export function mailRuleMatches(rule: MailRuleInput, message: MailRuleMessageInput): boolean {
  const { conditions } = parseMailRuleConfig(rule);
  return (
    includes(message.fromText, conditions.fromContains) &&
    includes(message.toText, conditions.toContains) &&
    includes(message.subject, conditions.subjectContains) &&
    includes(message.textBody, conditions.bodyContains)
  );
}

export function applyMailRules(
  rules: MailRuleInput[],
  message: MailRuleMessageInput,
): AppliedMailRules {
  const labels = new Set<string>();
  let assignedUserId: string | null = null;
  let isImportant = false;
  let crmFolder: string | null = null;
  let autoReply: AppliedMailRules["autoReply"] = null;
  const ruleLog: AppliedMailRules["ruleLog"] = [];

  for (const rule of rules) {
    if (!mailRuleMatches(rule, message)) continue;
    const { actions } = parseMailRuleConfig(rule);
    for (const label of actions.labels ?? []) labels.add(label);
    if (actions.assignUserId) assignedUserId = actions.assignUserId;
    if (actions.important === true) isImportant = true;
    if (actions.crmFolder) crmFolder = actions.crmFolder;
    if (!autoReply && actions.autoReply) {
      autoReply = { ruleId: rule.id, ...actions.autoReply };
    }
    ruleLog.push({ ruleId: rule.id, name: rule.name, actions });
  }

  return {
    labels: Array.from(labels),
    assignedUserId,
    isImportant,
    crmFolder,
    autoReply,
    ruleLog,
  };
}
