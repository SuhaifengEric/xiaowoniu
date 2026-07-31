-- CreateTable
CREATE TABLE "exam_countdowns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exam_name" VARCHAR(100) NOT NULL,
    "exam_date" DATE NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_countdowns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_subjects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "subject_name" VARCHAR(100) NOT NULL,
    "total_chapters" INTEGER NOT NULL,
    "current_chapter" INTEGER NOT NULL DEFAULT 0,
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "target_completion_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_checkins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "completed_chapters" INTEGER[] NOT NULL,
    "study_hours" DECIMAL(4,2) NOT NULL,
    "notes" TEXT,
    "progress_percentage" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_countdowns_user_id_is_archived_exam_date_idx" ON "exam_countdowns"("user_id", "is_archived", "exam_date");

-- CreateIndex
CREATE INDEX "study_subjects_user_id_exam_id_idx" ON "study_subjects"("user_id", "exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_subjects_exam_id_subject_name_key" ON "study_subjects"("exam_id", "subject_name");

-- CreateIndex
CREATE INDEX "study_checkins_user_id_date_idx" ON "study_checkins"("user_id", "date");

-- CreateIndex
CREATE INDEX "study_checkins_subject_id_date_idx" ON "study_checkins"("subject_id", "date");

-- AddForeignKey
ALTER TABLE "exam_countdowns" ADD CONSTRAINT "exam_countdowns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_subjects" ADD CONSTRAINT "study_subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_subjects" ADD CONSTRAINT "study_subjects_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exam_countdowns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_checkins" ADD CONSTRAINT "study_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_checkins" ADD CONSTRAINT "study_checkins_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "study_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
