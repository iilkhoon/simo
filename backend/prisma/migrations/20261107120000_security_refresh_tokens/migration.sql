-- Refresh token: ləğv vaxtı (təkrar istifadə aşkarlanması) və istifadəçi üzrə indeks
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
