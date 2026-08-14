-- CreateTable
CREATE TABLE "saving_deposits" (
    "id" TEXT NOT NULL,
    "saving_plan_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE,
    "notes" TEXT,
    "source" VARCHAR(32) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saving_deposits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "saving_deposits_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "saving_deposits_source_check" CHECK ("source" IN ('manual', 'legacy_import')),
    CONSTRAINT "saving_deposits_manual_date_check" CHECK ("source" <> 'manual' OR "date" IS NOT NULL)
);

-- CreateIndex
CREATE INDEX "saving_deposits_saving_plan_id_date_created_at_idx" ON "saving_deposits"("saving_plan_id", "date", "created_at");

-- AddForeignKey
ALTER TABLE "saving_deposits" ADD CONSTRAINT "saving_deposits_saving_plan_id_fkey" FOREIGN KEY ("saving_plan_id") REFERENCES "saving_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Stage A backfill: preserve the old aggregate as an explicitly marked record.
INSERT INTO "saving_deposits" ("id", "saving_plan_id", "amount", "date", "notes", "source", "created_at", "updated_at")
SELECT
    'legacy-' || "id",
    "id",
    "current_amount",
    NULL,
    '原计划已存金额，原始存入日期未知',
    'legacy_import',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "saving_plans"
WHERE "current_amount" > 0;
