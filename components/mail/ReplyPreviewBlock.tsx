"use client";

import { memo, useMemo } from "react";
import {
  REPLY_BLOCK_TYPE_LABELS,
  renderSingleReplyBlockHtml,
  SAMPLE_ORDER_STATUS_URL,
  type ReplyBlock,
  type ReplyBlockAssetRef,
} from "@/lib/mail/reply-block-editor";
import { substituteReplyTemplateCidsForPreview } from "@/lib/mail/reply-template-cid";

const SAMPLE_CONTEXT = {
  orderNumber: "2606-285",
  patientName: "Иванова А. С.",
  doctorName: "Петров П. П.",
  clinicName: "Клиника «Альфа»",
  clinicAddress: "ул. Ленина, 1",
  date: "20.06.26",
  dueDate: "22.06.26, 14:00",
  appointmentDate: "25.06.26, 10:00",
  originalSubject: "Заказ на коронки",
  originalFrom: "Клиника <clinic@example.com>",
  orderStatusUrl: SAMPLE_ORDER_STATUS_URL,
};

type Props = {
  block: ReplyBlock;
  blockKey: string;
  assets: ReplyBlockAssetRef[];
  accountId?: string;
  contentWidth: number;
  globalFont?: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export const ReplyPreviewBlock = memo(function ReplyPreviewBlock({
  block,
  assets,
  accountId,
  contentWidth,
  globalFont,
  selected,
  disabled,
  onSelect,
}: Props) {
  const html = useMemo(() => {
    let rendered = renderSingleReplyBlockHtml(block, SAMPLE_CONTEXT, assets, {
      globalFont,
      contentWidthPx: contentWidth,
    });
    if (accountId) {
      rendered = substituteReplyTemplateCidsForPreview(rendered, assets, accountId);
    }
    return rendered;
  }, [block, assets, accountId, contentWidth, globalFont]);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={[
        "relative cursor-pointer rounded-md transition-shadow",
        selected
          ? "ring-2 ring-[var(--sidebar-blue)] ring-offset-1"
          : "hover:ring-1 hover:ring-blue-200",
      ].join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onSelect();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      title={REPLY_BLOCK_TYPE_LABELS[block.type]}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}, (prev, next) =>
  prev.blockKey === next.blockKey &&
  prev.selected === next.selected &&
  prev.disabled === next.disabled &&
  prev.contentWidth === next.contentWidth &&
  prev.globalFont === next.globalFont &&
  prev.accountId === next.accountId &&
  prev.assets === next.assets,
);
