-- CreateTable
CREATE TABLE "SafetyProfile" (
    "userId" TEXT NOT NULL,
    "videoNoticeAt" TIMESTAMP(3),
    "videoNoticeVersion" TEXT,
    "hostAgreementAt" TIMESTAMP(3),
    "hostAgreementVersion" TEXT,
    "agencyAgreementAt" TIMESTAMP(3),
    "agencyAgreementVersion" TEXT,
    "strikes" INTEGER NOT NULL DEFAULT 0,
    "lastStrikeAt" TIMESTAMP(3),
    "suspendedUntil" TIMESTAMP(3),
    "suspensionActive" BOOLEAN NOT NULL DEFAULT false,
    "suspendReason" TEXT,
    "permanentBan" BOOLEAN NOT NULL DEFAULT false,
    "declaredMinorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "SafetyStrike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'AUTO',
    "contextType" TEXT,
    "contextId" TEXT,
    "evidenceId" TEXT,
    "actorId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyStrike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyEvidence" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "contextType" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "peerId" TEXT,
    "reporterId" TEXT,
    "reportId" TEXT,
    "filePath" TEXT,
    "sha256" TEXT,
    "provider" TEXT NOT NULL,
    "scores" JSONB NOT NULL DEFAULT '{}',
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verdict" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgeCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verificationId" TEXT,
    "source" TEXT NOT NULL,
    "declaredBirthDate" TIMESTAMP(3),
    "idBirthDate" TIMESTAMP(3),
    "ageYears" INTEGER,
    "passed" BOOLEAN NOT NULL,
    "actorId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgeCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SafetyStrike_userId_createdAt_idx" ON "SafetyStrike"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyStrike_contextType_contextId_idx" ON "SafetyStrike"("contextType", "contextId");

-- CreateIndex
CREATE INDEX "SafetyEvidence_reviewStatus_createdAt_idx" ON "SafetyEvidence"("reviewStatus", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyEvidence_subjectId_createdAt_idx" ON "SafetyEvidence"("subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyEvidence_contextType_contextId_idx" ON "SafetyEvidence"("contextType", "contextId");

-- CreateIndex
CREATE INDEX "SafetyEvidence_expiresAt_idx" ON "SafetyEvidence"("expiresAt");

-- CreateIndex
CREATE INDEX "AgeCheck_userId_createdAt_idx" ON "AgeCheck"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyAuditLog_targetUserId_createdAt_idx" ON "SafetyAuditLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyAuditLog_action_createdAt_idx" ON "SafetyAuditLog"("action", "createdAt");
