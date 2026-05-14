export type MailAddress = {
  name: string | null;
  address: string;
};

export type MailFolderType =
  | "INBOX"
  | "SENT"
  | "DRAFTS"
  | "SPAM"
  | "TRASH"
  | "ARCHIVE"
  | "CUSTOM";

const SYSTEM_FOLDER_NAMES: Record<Exclude<MailFolderType, "CUSTOM">, string> = {
  INBOX: "Входящие",
  SENT: "Отправленные",
  DRAFTS: "Черновики",
  SPAM: "Спам",
  TRASH: "Корзина",
  ARCHIVE: "Архив",
};

export type MailFolder = {
  id: string;
  accountId: string;
  imapName: string;
  displayName: string;
  type: MailFolderType;
  unreadCount: number;
  totalCount: number;
  sortOrder: number;
};

export function mailFolderDisplayName(folder: Pick<MailFolder, "displayName" | "type">): string {
  if (folder.type !== "CUSTOM") {
    return SYSTEM_FOLDER_NAMES[folder.type];
  }

  return folder.displayName;
}

export type MailLabel = {
  id: string;
  accountId: string;
  name: string;
  color: string;
  unreadCount: number;
  totalCount: number;
};

export type MailAccount = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  hasPassword: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  folders: MailFolder[];
  labels: MailLabel[];
  _count?: { emails: number };
};

export type MailEmailRow = {
  id: string;
  accountId: string;
  folderId: string | null;
  direction: "INBOUND" | "OUTBOUND" | "DRAFT";
  isRead: boolean;
  isFlagged: boolean;
  hasAttachments: boolean;
  fromName: string | null;
  fromAddress: string | null;
  to: MailAddress[] | null;
  subject: string | null;
  preview: string | null;
  receivedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  labelAssignments?: Array<{ label: MailLabel }>;
  _count?: { attachments: number };
};

export type MailAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  isInline: boolean;
};

export type MailEmailDetail = MailEmailRow & {
  cc: MailAddress[] | null;
  bcc: MailAddress[] | null;
  textBody: string | null;
  htmlBody: string | null;
  safeHtmlBody: string;
  attachments: MailAttachment[];
  account: { id: string; email: string; displayName: string | null };
  folder: MailFolder | null;
};

export type MailFilter = "all" | "unread" | "attachments" | "flagged";
