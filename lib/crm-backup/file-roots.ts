/**
 * Корни файлов CRM, которые входят в полный бекап (не логи и не сами zip-дампы).
 * Пути те же, что у живого процесса: env или data/…
 */
import path from "node:path";

export const CRM_BACKUP_FILE_ROOT_IDS = [
  "order-attachments",
  "mail-attachments",
  "clickmig-files",
  "user-avatars",
  "ai-dataset",
  "templates",
] as const;

export type CrmBackupFileRootId = (typeof CRM_BACKUP_FILE_ROOT_IDS)[number];

function resolveDir(envName: string, fallbackSegments: string[]): string {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.join(process.cwd(), fromEnv);
  }
  return path.join(process.cwd(), ...fallbackSegments);
}

export function crmBackupFileRoots(): {
  id: CrmBackupFileRootId;
  absPath: string;
}[] {
  return [
    {
      id: "order-attachments",
      absPath: resolveDir("ORDER_ATTACHMENT_STORAGE_DIR", [
        "data",
        "order-attachments",
      ]),
    },
    {
      id: "mail-attachments",
      absPath: resolveDir("MAIL_ATTACHMENT_STORAGE_DIR", [
        "data",
        "mail-attachments",
      ]),
    },
    {
      id: "clickmig-files",
      absPath: resolveDir("CLICKMIG_STORAGE_DIR", ["data", "clickmig-files"]),
    },
    {
      id: "user-avatars",
      absPath: path.join(process.cwd(), "data", "user-avatars"),
    },
    {
      id: "ai-dataset",
      absPath: resolveDir("AI_DATASET_DIR", ["data", "ai-dataset"]),
    },
    {
      id: "templates",
      absPath: path.join(process.cwd(), "data", "templates"),
    },
  ];
}

export function crmBackupFileRootById(
  id: string,
): { id: CrmBackupFileRootId; absPath: string } | null {
  if (!CRM_BACKUP_FILE_ROOT_IDS.includes(id as CrmBackupFileRootId)) {
    return null;
  }
  return crmBackupFileRoots().find((r) => r.id === id) ?? null;
}

export const CRM_BACKUP_S3_DATA_PREFIXES = [
  "orders/",
  "tenants/",
  "clickmig/",
] as const;
