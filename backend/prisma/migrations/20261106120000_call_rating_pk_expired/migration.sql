-- Zəngdən sonra qiymətləndirmə (1–5)
ALTER TABLE "Call" ADD COLUMN "callerRating" INTEGER;
ALTER TABLE "Call" ADD COLUMN "calleeRating" INTEGER;

-- Cavabsız qalan PK dəvətləri
ALTER TYPE "PkStatus" ADD VALUE 'EXPIRED';
