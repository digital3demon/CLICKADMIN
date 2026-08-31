-- CRM-канбан: общий чеклист linked-карточки (все сотрудники видят одно).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanChecklist" JSONB;
