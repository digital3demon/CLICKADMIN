-- Время возврата по строке расхода; новый вид движения DEFECT_WRITE_OFF задаётся приложением (kind TEXT).
ALTER TABLE "StockMovement" ADD COLUMN "returnedToWarehouseAt" DATETIME;
