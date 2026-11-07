-- Mövsümi kampaniyalar və host "onlayn oldu" bildiriş limiti
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleAz" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "subtitleAz" TEXT NOT NULL DEFAULT '',
    "subtitleRu" TEXT NOT NULL DEFAULT '',
    "subtitleEn" TEXT NOT NULL DEFAULT '',
    "prizesAz" TEXT NOT NULL DEFAULT '',
    "prizesRu" TEXT NOT NULL DEFAULT '',
    "prizesEn" TEXT NOT NULL DEFAULT '',
    "emoji" TEXT NOT NULL DEFAULT '🎉',
    "color" TEXT NOT NULL DEFAULT '#FF3D7F',
    "color2" TEXT NOT NULL DEFAULT '#7B5CFF',
    "imageUrl" TEXT,
    "giftIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "announce" BOOLEAN NOT NULL DEFAULT true,
    "announcedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");
CREATE INDEX "Campaign_active_endsAt_idx" ON "Campaign"("active", "endsAt");

CREATE TABLE "HostOnlineAlert" (
    "hostId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reached" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "HostOnlineAlert_pkey" PRIMARY KEY ("hostId")
);
