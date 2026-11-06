-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "customShare" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "AgencyJoinRequest" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "message" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "rejectReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'APPLY';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "agencyLeftAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "feeQepik" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectReason" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "HostEarning" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "paidCoins" INTEGER NOT NULL,
    "hostAmount" INTEGER NOT NULL,
    "agencyAmount" INTEGER NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostDailyStat" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "onlineSec" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HostDailyStat_pkey" PRIMARY KEY ("userId","day")
);

-- CreateTable
CREATE TABLE "AgencySettlement" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "paidCoins" INTEGER NOT NULL,
    "hostAmount" INTEGER NOT NULL,
    "agencyAmount" INTEGER NOT NULL,
    "hosts" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencySettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HostEarning_agencyId_createdAt_idx" ON "HostEarning"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "HostEarning_hostId_createdAt_idx" ON "HostEarning"("hostId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgencySettlement_agencyId_week_key" ON "AgencySettlement"("agencyId", "week");

-- AddForeignKey
ALTER TABLE "HostEarning" ADD CONSTRAINT "HostEarning_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencySettlement" ADD CONSTRAINT "AgencySettlement_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Balanslar heç vaxt mənfi ola bilməz (son müdafiə xətti; NOT VALID — köhnə sətirlər yoxlanmır, yeni yazılar yoxlanır)
ALTER TABLE "User" ADD CONSTRAINT "User_coins_nonneg" CHECK ("coins" >= 0) NOT VALID;
ALTER TABLE "User" ADD CONSTRAINT "User_promoCoins_nonneg" CHECK ("promoCoins" >= 0) NOT VALID;
ALTER TABLE "User" ADD CONSTRAINT "User_diamonds_nonneg" CHECK ("diamonds" >= 0) NOT VALID;
ALTER TABLE "User" ADD CONSTRAINT "User_diamondsBought_nonneg" CHECK ("diamondsBought" >= 0) NOT VALID;
