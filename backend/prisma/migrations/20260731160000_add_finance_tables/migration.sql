-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "payment_method" VARCHAR(32) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expenses_amount_check" CHECK ("amount" > 0)
);

-- CreateTable
CREATE TABLE "monthly_budgets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_budgets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "monthly_budgets_amount_check" CHECK ("amount" >= 0)
);

-- CreateTable
CREATE TABLE "saving_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "target_amount" DECIMAL(12,2) NOT NULL,
    "current_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "target_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saving_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "saving_plans_target_amount_check" CHECK ("target_amount" > 0),
    CONSTRAINT "saving_plans_current_amount_nonnegative_check" CHECK ("current_amount" >= 0),
    CONSTRAINT "saving_plans_current_amount_limit_check" CHECK ("current_amount" <= "target_amount")
);

-- CreateIndex
CREATE INDEX "expenses_user_id_date_idx" ON "expenses"("user_id", "date");

-- CreateIndex
CREATE INDEX "expenses_user_id_category_date_idx" ON "expenses"("user_id", "category", "date");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_budgets_user_id_month_key" ON "monthly_budgets"("user_id", "month");

-- CreateIndex
CREATE INDEX "saving_plans_user_id_target_date_idx" ON "saving_plans"("user_id", "target_date");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saving_plans" ADD CONSTRAINT "saving_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
