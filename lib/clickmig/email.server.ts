import "server-only";

import nodemailer from "nodemailer";
import type { ClickMigApplication, ClickMigConfig } from "@prisma/client";
import { clickMigMaterialLabel } from "./material-labels";
import type { ClickMigConfigJson } from "./types";

function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

function doctorEmailFromApplication(app: ClickMigApplication): string | null {
  return app.guestEmail?.trim() || null;
}

function doctorNameFromApplication(app: ClickMigApplication): string {
  return app.guestDoctorName?.trim() || "Коллега";
}

async function sendClickMigSmtp(
  configRow: ClickMigConfig,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const host = configRow.smtpHost?.trim();
  const user = configRow.smtpUser?.trim();
  const pass = configRow.smtpPass?.trim();
  const fromEmail =
    configRow.smtpFromEmail?.trim() || user || "noreply@clickmig.ru";
  const fromName = configRow.smtpFromName?.trim() || "КликМиг";

  if (!host || !user || !pass) {
    console.warn("[clickmig-email] SMTP not configured, skipping send to", to);
    return;
  }

  const transport = nodemailer.createTransport({
    host,
    port: configRow.smtpPort ?? 465,
    secure: (configRow.smtpPort ?? 465) === 465,
    auth: { user, pass },
  });

  await transport.sendMail({
    from: `"${fromName.replaceAll('"', "'")}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
}

function baseVars(
  app: ClickMigApplication,
  config: ClickMigConfigJson,
  extra: Record<string, string> = {},
): Record<string, string> {
  const ct = config.constructionTypes.find(
    (c) => c.key === app.constructionTypeKey,
  );
  return {
    publicNumber: app.publicNumber,
    patientName: app.patientName,
    doctorName: doctorNameFromApplication(app),
    materialLabel: clickMigMaterialLabel(app.material),
    constructionName: ct?.name ?? app.constructionTypeKey,
    shadeCode: app.shadeCode ?? "",
    ...extra,
  };
}

export async function sendClickMigAcceptedEmail(
  configRow: ClickMigConfig,
  config: ClickMigConfigJson,
  app: ClickMigApplication,
): Promise<void> {
  const to = doctorEmailFromApplication(app);
  if (!to) return;
  const vars = baseVars(app, config);
  await sendClickMigSmtp(
    configRow,
    to,
    renderTemplate(config.emailTemplates.acceptedSubject, vars),
    renderTemplate(config.emailTemplates.acceptedHtml, vars),
  );
}

export async function sendClickMigRejectedEmail(
  configRow: ClickMigConfig,
  config: ClickMigConfigJson,
  app: ClickMigApplication,
  reason: string,
): Promise<void> {
  const to = doctorEmailFromApplication(app);
  if (!to) return;
  const vars = baseVars(app, config, { reason });
  await sendClickMigSmtp(
    configRow,
    to,
    renderTemplate(config.emailTemplates.rejectedSubject, vars),
    renderTemplate(config.emailTemplates.rejectedHtml, vars),
  );
}

export async function sendClickMigBlockedEmail(
  configRow: ClickMigConfig,
  config: ClickMigConfigJson,
  app: ClickMigApplication,
  reason: string,
  resubmitUrl: string,
  videoUrl: string,
): Promise<void> {
  const to = doctorEmailFromApplication(app);
  if (!to) return;
  const vars = baseVars(app, config, { reason, resubmitUrl, videoUrl });
  await sendClickMigSmtp(
    configRow,
    to,
    renderTemplate(config.emailTemplates.blockedSubject, vars),
    renderTemplate(config.emailTemplates.blockedHtml, vars),
  );
}
