/** Блочный редактор шаблона ответного письма (v1). */

export type ReplyLayoutType = "blocks" | "freeform";

export type BlockStyle = {
  backgroundColor?: string;
  textColor?: string;
  paddingPx?: number;
  fontSizePx?: number;
  fontFamily?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonRadiusPx?: number;
  align?: "left" | "center" | "right";
};

export type ButtonVariant = "primary" | "secondary" | "outline";

export type ButtonAction =
  | { type: "url"; href: string }
  | { type: "tel"; phone: string }
  | { type: "download"; href: string };

export type ReplyButtonDef = {
  id: string;
  label: string;
  variant: ButtonVariant;
  action: ButtonAction;
};

export type ReplyBlockBase = {
  id: string;
  style?: BlockStyle;
};

export type HeroBlock = ReplyBlockBase & {
  type: "hero";
  logoAssetId?: string | null;
  headline: string;
  subtitle?: string;
  editableHeadlineInPreflight?: boolean;
};

export type TextBlock = ReplyBlockBase & {
  type: "text";
  content: string;
  editableInPreflight?: boolean;
};

export type ButtonsBlock = ReplyBlockBase & {
  type: "buttons";
  buttons: ReplyButtonDef[];
};

export type ImageBlock = ReplyBlockBase & {
  type: "image";
  assetId: string;
  widthPx: number;
  align?: "left" | "center" | "right";
};

export type DividerBlock = ReplyBlockBase & {
  type: "divider";
  heightPx: number;
  color?: string;
};

export type AttachHintBlock = ReplyBlockBase & {
  type: "attach_hint";
  text: string;
};

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterBlock = ReplyBlockBase & {
  type: "footer";
  text: string;
  links?: FooterLink[];
};

export type ReplyBlock =
  | HeroBlock
  | TextBlock
  | ButtonsBlock
  | ImageBlock
  | DividerBlock
  | AttachHintBlock
  | FooterBlock;

export type ReplyBlockType = ReplyBlock["type"];

export type ReplyEditorGlobal = {
  fontFamily?: string;
  contentWidthPx?: number;
};

export type ReplyEditorDocument = {
  version: 1;
  blocks: ReplyBlock[];
  global?: ReplyEditorGlobal;
};

export type ReplyPreflightOverrides = {
  dateYmd?: string;
  textOverrides?: Record<string, string>;
  headlineOverrides?: Record<string, string>;
};

export type ReplyBlockAssetRef = {
  id: string;
  contentId: string;
};

export const REPLY_BLOCK_TYPE_LABELS: Record<ReplyBlockType, string> = {
  hero: "Шапка",
  text: "Текст",
  buttons: "Кнопки",
  image: "Картинка",
  divider: "Разделитель",
  attach_hint: "Вложения",
  footer: "Футер",
};

export const REPLY_EDITOR_FONT_OPTIONS = [
  "Arial, sans-serif",
  "Georgia, serif",
  '"Times New Roman", Times, serif',
  "Verdana, sans-serif",
  "Tahoma, sans-serif",
] as const;
