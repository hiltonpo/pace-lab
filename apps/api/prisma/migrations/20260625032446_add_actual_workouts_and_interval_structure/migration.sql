-- AlterTable
ALTER TABLE "planned_workouts" ADD COLUMN     "cooldownKm" DOUBLE PRECISION,
ADD COLUMN     "intervals" JSONB,
ADD COLUMN     "warmupKm" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "actual_workouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plannedWorkoutId" TEXT,
    "planId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "workoutType" TEXT NOT NULL,
    "actualDistanceKm" DOUBLE PRECISION NOT NULL,
    "actualDurationSec" INTEGER NOT NULL,
    "actualPaceSec" INTEGER,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "rpe" INTEGER,
    "weather" TEXT,
    "temperatureC" DOUBLE PRECISION,
    "feeling" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actual_workouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "actual_workouts_userId_idx" ON "actual_workouts"("userId");

-- CreateIndex
CREATE INDEX "actual_workouts_userId_date_idx" ON "actual_workouts"("userId", "date");

-- CreateIndex
CREATE INDEX "actual_workouts_planId_idx" ON "actual_workouts"("planId");

-- CreateIndex
CREATE INDEX "actual_workouts_plannedWorkoutId_idx" ON "actual_workouts"("plannedWorkoutId");

-- AddForeignKey
ALTER TABLE "actual_workouts" ADD CONSTRAINT "actual_workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actual_workouts" ADD CONSTRAINT "actual_workouts_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "planned_workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actual_workouts" ADD CONSTRAINT "actual_workouts_planId_fkey" FOREIGN KEY ("planId") REFERENCES "training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
