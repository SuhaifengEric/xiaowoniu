-- CreateTable
CREATE TABLE "fitness_checkins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "activity_type" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fitness_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time_of_day" TEXT NOT NULL,
    "weight_kg" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitness_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_weight_kg" DECIMAL(5,2),
    "weekly_workout_target" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "target_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fitness_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fitness_checkins_user_id_date_key" ON "fitness_checkins"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "weight_records_user_id_date_time_of_day_key" ON "weight_records"("user_id", "date", "time_of_day");

-- AddForeignKey
ALTER TABLE "fitness_checkins" ADD CONSTRAINT "fitness_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitness_goals" ADD CONSTRAINT "fitness_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
