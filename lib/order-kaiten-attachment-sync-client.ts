/** После фоновой загрузки вложений — догрузить их в Kaiten, если карточка уже есть. */
export async function requestOrderKaitenAttachmentSync(
  orderId: string,
): Promise<void> {
  const id = String(orderId || "").trim();
  if (!id) return;
  try {
    const res = await fetch(
      `/api/orders/${encodeURIComponent(id)}/kaiten-sync-attachments`,
      { method: "POST", credentials: "same-origin" },
    );
    if (!res.ok) {
      console.warn("[kaiten-attachment-sync] request failed", res.status);
    }
  } catch (e) {
    console.warn("[kaiten-attachment-sync] request error", e);
  }
}
