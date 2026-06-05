"use client";

import { StickerTemplateEditor } from "@/components/directory/StickerTemplateEditor";

export function PrintTenantSettings({ canEdit }: { canEdit: boolean }) {
  return <StickerTemplateEditor canEdit={canEdit} />;
}
