-- Отдельный доступ к блоку «Оплаты» в левом сайдбаре.
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'SIDEBAR_PAYMENTS';
