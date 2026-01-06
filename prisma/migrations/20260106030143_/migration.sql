-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shiftEnd" TEXT,
ADD COLUMN     "shiftStart" TEXT;

-- AlterTable
ALTER TABLE "VehicleExit" ADD COLUMN     "finalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");
