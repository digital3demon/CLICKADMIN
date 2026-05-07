# Changelog

## 2026-05-08

- Reordered sidebar blocks so `Мессенджеры` appears above `Обратите внимание`.
- Updated order list Kaiten pill: when a card is not in Kaiten but exists in CRM Kanban, the pill now shows a small second line with the current Kanban column/type status.

## 2026-05-07

- Added bidirectional CRM Kanban ↔ Kaiten chat sync with dedupe/anti-loop and unified comment contract (`source`, `externalCommentId`, `externalParentId`, `syncStatus`, `syncedAt`).
- Added server chat API for order-linked Kanban cards, manual retry for failed sync, and background retry polling.
- Updated chat UIs in orders and Kanban card modal: unified thread view, sync status labels, reply flow, and action buttons for corrections/prosthetics.
- Added Telegram messenger and doctor-group integration endpoints/components plus supporting bot/webhook handling updates.
- Added analytics additions for production/messenger reporting and related schema/API wiring.
- Updated Prisma schema and migrations for new messenger/analytics/chat-related entities and enums.
- Added/updated tests for chat sync, Telegram mention/link helpers, and doctor group binding logic.
