-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('VIDEO_CALL', 'VOICE_CALL', 'CHAT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DONE', 'CANCELLED', 'DECLINED');

-- AlterEnum
ALTER TYPE "VideoStatus" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "CoinPackage" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'COIN';

-- AlterTable
ALTER TABLE "Gift" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'COIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "acceptVideo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "acceptVoice" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "callHours" JSONB,
ADD COLUMN     "diamondsBought" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notifPrefs" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "presence" TEXT NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "profileExtra" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "smartPushCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "smartPushDate" TEXT;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "commentsOff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "teaser" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTaste" (
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTaste_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "packageId" TEXT,
    "bonusPct" INTEGER NOT NULL DEFAULT 0,
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ServiceKind" NOT NULL DEFAULT 'CUSTOM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrder" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "paid" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserEvent_userId_createdAt_idx" ON "UserEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserEvent_kind_createdAt_idx" ON "UserEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_userId_expiresAt_idx" ON "Offer"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Service_userId_active_idx" ON "Service"("userId", "active");

-- CreateIndex
CREATE INDEX "ServiceOrder_sellerId_status_idx" ON "ServiceOrder"("sellerId", "status");

-- CreateIndex
CREATE INDEX "ServiceOrder_buyerId_createdAt_idx" ON "ServiceOrder"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "Video_hashtags_idx" ON "Video" USING GIN ("hashtags");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
