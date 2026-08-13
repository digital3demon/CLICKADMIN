/**
 * Период отправки наряда (`adminShippedAt`, колонка «Отправка») по календарю МСК.
 * URL: `otprFrom` / `otprTo` (YYYY-MM-DD). Границы — как у ЛАБ (`ordersListDueDatePeriod`).
 */
import { ordersListDueDatePeriod } from "@/lib/orders-list-period";

export const ordersListOtprPeriod = ordersListDueDatePeriod;
