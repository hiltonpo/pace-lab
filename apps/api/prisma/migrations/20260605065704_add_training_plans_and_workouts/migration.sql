-- CreateTable
CREATE TABLE "training_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goalRaceType" TEXT NOT NULL,
    "goalTimeSec" INTEGER NOT NULL,
    "vdot" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "weeksTotal" INTEGER NOT NULL DEFAULT 8,
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_workouts" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "workoutType" TEXT NOT NULL,
    "targetPaceSec" INTEGER,
    "targetDistanceKm" DOUBLE PRECISION,
    "targetDurationSec" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planned_workouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_plans_userId_idx" ON "training_plans"("userId");

-- CreateIndex
CREATE INDEX "training_plans_userId_status_idx" ON "training_plans"("userId", "status");

-- CreateIndex
CREATE INDEX "planned_workouts_planId_idx" ON "planned_workouts"("planId");

-- CreateIndex
CREATE INDEX "planned_workouts_planId_weekNumber_idx" ON "planned_workouts"("planId", "weekNumber");

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_planId_fkey" FOREIGN KEY ("planId") REFERENCES "training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
