-- Promo (pulsuz) coin balansı: bonus coinlər xərclənəndə qəbul edənə nağdlaşan almaz yazılmır
ALTER TABLE "User" ADD COLUMN "promoCoins" INTEGER NOT NULL DEFAULT 0;

-- Yeni zəng qiyməti defoltları (dəqiqəlik coin) və köhnə aşağı qiymətlərin minimuma qaldırılması
ALTER TABLE "User" ALTER COLUMN "videoCallPrice" SET DEFAULT 80;
ALTER TABLE "User" ALTER COLUMN "voiceCallPrice" SET DEFAULT 40;
UPDATE "User" SET "videoCallPrice" = 40 WHERE "videoCallPrice" < 40;
UPDATE "User" SET "voiceCallPrice" = 20 WHERE "voiceCallPrice" < 20;
