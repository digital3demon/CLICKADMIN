CREATE TYPE "PayrollUserTrack" AS ENUM ('DIGITAL', 'MANUAL', 'DIGITAL_MANUAL', 'SHOP_FLOOR');

ALTER TABLE "User" ADD COLUMN "payrollTrack" "PayrollUserTrack";
