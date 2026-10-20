-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('INACTIVE', 'IDLE', 'RUNNING', 'STOPPED');

-- CreateEnum
CREATE TYPE "ShiftAllocationStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "machines" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100),
    "status" "MachineStatus" NOT NULL DEFAULT 'IDLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_allocations" (
    "id" UUID NOT NULL,
    "machineId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "shiftDate" DATE NOT NULL,
    "status" "ShiftAllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "openedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ,

    CONSTRAINT "shift_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "machines_code_key" ON "machines"("code");

-- CreateIndex
CREATE INDEX "shift_allocations_machineId_shiftDate_idx" ON "shift_allocations"("machineId", "shiftDate");

-- CreateIndex
CREATE INDEX "shift_allocations_operatorId_shiftDate_idx" ON "shift_allocations"("operatorId", "shiftDate");

-- AddForeignKey
ALTER TABLE "shift_allocations" ADD CONSTRAINT "shift_allocations_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_allocations" ADD CONSTRAINT "shift_allocations_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_allocations" ADD CONSTRAINT "shift_allocations_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex (RN-01: Exclusividade 1:1 de máquina ativa por turno e data)
CREATE UNIQUE INDEX "idx_unique_active_machine_shift" 
ON "shift_allocations" ("machineId", "shiftId", "shiftDate") 
WHERE "status" = 'ACTIVE';

