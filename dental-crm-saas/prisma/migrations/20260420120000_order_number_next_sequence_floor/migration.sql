-- Ручной сдвиг следующего номера наряда (не ниже max+1 для текущего YYMM).
ALTER TABLE "OrderNumberSettings" ADD COLUMN "nextSequenceFloor" INTEGER;
