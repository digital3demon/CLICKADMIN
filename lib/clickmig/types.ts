import type { ClickMigMaterial } from "@prisma/client";

export type ClickMigConstructionType = {
  key: string;
  name: string;
  requiresScanbody?: boolean;
};

export type ClickMigStageTimer = {
  key: string;
  label: string;
  durationMs: number;
};

export type ClickMigColumnTimer = {
  columnId: string;
  label: string;
  durationMs: number;
};

export type ClickMigTimerBehaviors = {
  checkmark: "stop" | "pause";
  cross: "stop_and_block";
  columnMove: "stop";
};

export type ClickMigValidationHint = {
  field: string;
  label: string;
  whyImportant: string;
  required: boolean;
};

export type ClickMigEmailTemplates = {
  acceptedSubject: string;
  acceptedHtml: string;
  rejectedSubject: string;
  rejectedHtml: string;
  blockedSubject: string;
  blockedHtml: string;
};

export type ClickMigConfigJson = {
  constructionTypes: ClickMigConstructionType[];
  scanbodyManufacturers: string[];
  shadeOptions: { group: "A" | "C"; codes: string[] };
  defaultAssigneeUserId: string | null;
  participantUserIds: string[];
  maxCardsPerParticipant: number;
  columnTimers: ClickMigColumnTimer[];
  stageTimers: ClickMigStageTimer[];
  timerBehaviors: ClickMigTimerBehaviors;
  validationHints: ClickMigValidationHint[];
  emailTemplates: ClickMigEmailTemplates;
  allowedOrigins: string[];
};

export type ClickMigApplicationInput = {
  patientName: string;
  doctorName: string;
  doctorEmail: string;
  clinic?: string;
  address?: string;
  constructionTypeKey: string;
  material: ClickMigMaterial;
  teethFdi: string[];
  screwRetained?: boolean;
  scanbodyManufacturer?: string;
  shadeGroup?: string;
  shadeCode?: string;
  shadeDetail?: string;
  clientNotes?: string;
  photoLinks?: string[];
  scanLinks?: string[];
  clientId?: string;
};

export type ClickMigValidationResult = {
  valid: boolean;
  hints: Array<ClickMigValidationHint & { filled: boolean }>;
};

export const CLICKMIG_BLOCKED_FIELD_KEYS = [
  "scans",
  "photos",
  "clientNotes",
] as const;

export type ClickMigBlockedFieldKey =
  (typeof CLICKMIG_BLOCKED_FIELD_KEYS)[number];
