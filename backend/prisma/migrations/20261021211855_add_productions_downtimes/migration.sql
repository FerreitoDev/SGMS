-- CreateEnum
CREATE TYPE "DowntimeReason" AS ENUM ('PRE_FORMA', 'COMPRESSOR', 'AQUECIMENTO_FORNO', 'MOLDE', 'MECANICA', 'ELETRICA', 'OUTROS');

-- CreateEnum
CREATE TYPE "DowntimeStatus" AS ENUM ('IN_PROGRESS', 'RESOLVED');

-- CreateTable
CREATE TABLE "production_entries" (
    "id" UUID NOT NULL,
    "clientUuid" UUID NOT NULL,
    "allocationId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "downtime_records" (
    "id" UUID NOT NULL,
    "clientUuid" UUID NOT NULL,
    "allocationId" UUID NOT NULL,
    "reason" "DowntimeReason" NOT NULL,
    "justification" VARCHAR(255),
    "status" "DowntimeStatus" NOT NULL,
    "startTime" TIMESTAMPTZ NOT NULL,
    "endTime" TIMESTAMPTZ,
    "durationMinutes" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "downtime_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "production_entries_clientUuid_key" ON "production_entries"("clientUuid");

-- CreateIndex
CREATE INDEX "production_entries_allocationId_timestamp_idx" ON "production_entries"("allocationId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "downtime_records_clientUuid_key" ON "downtime_records"("clientUuid");

-- CreateIndex
CREATE INDEX "downtime_records_allocationId_reason_idx" ON "downtime_records"("allocationId", "reason");

-- CreateIndex
CREATE INDEX "downtime_records_startTime_endTime_idx" ON "downtime_records"("startTime", "endTime");

-- AddForeignKey
ALTER TABLE "production_entries" ADD CONSTRAINT "production_entries_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "shift_allocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downtime_records" ADD CONSTRAINT "downtime_records_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "shift_allocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraints (RF-06: Quantidade estritamente positiva & Duração não-negativa)
ALTER TABLE "production_entries" ADD CONSTRAINT "chk_production_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "downtime_records" ADD CONSTRAINT "chk_downtime_duration_non_negative" CHECK ("durationMinutes" IS NULL OR "durationMinutes" >= 0);

