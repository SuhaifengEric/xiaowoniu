-- CreateTable
CREATE TABLE "wedding_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "planned_date" DATE,
    "completed_date" DATE,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wedding_tasks_priority_check" CHECK ("priority" BETWEEN 1 AND 5)
);

-- CreateTable
CREATE TABLE "wedding_expenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT,
    "date" DATE NOT NULL,
    "item_name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "planned_amount" DECIMAL(12,2) NOT NULL,
    "actual_amount" DECIMAL(12,2) NOT NULL,
    "paid_status" VARCHAR(32) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_expenses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wedding_expenses_amount_check" CHECK ("planned_amount" >= 0 AND "actual_amount" >= 0)
);

-- CreateTable
CREATE TABLE "wedding_budgets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_budget" DECIMAL(12,2) NOT NULL,
    "wedding_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_budgets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wedding_budgets_total_budget_check" CHECK ("total_budget" >= 0)
);

-- CreateIndex
CREATE INDEX "wedding_tasks_user_id_status_planned_date_idx" ON "wedding_tasks"("user_id", "status", "planned_date");

-- CreateIndex
CREATE INDEX "wedding_tasks_user_id_category_planned_date_idx" ON "wedding_tasks"("user_id", "category", "planned_date");

-- CreateIndex
CREATE INDEX "wedding_expenses_user_id_date_idx" ON "wedding_expenses"("user_id", "date");

-- CreateIndex
CREATE INDEX "wedding_expenses_user_id_category_date_idx" ON "wedding_expenses"("user_id", "category", "date");

-- CreateIndex
CREATE INDEX "wedding_expenses_user_id_paid_status_date_idx" ON "wedding_expenses"("user_id", "paid_status", "date");

-- CreateIndex
CREATE INDEX "wedding_expenses_task_id_idx" ON "wedding_expenses"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_budgets_user_id_key" ON "wedding_budgets"("user_id");

-- AddForeignKey
ALTER TABLE "wedding_tasks" ADD CONSTRAINT "wedding_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_expenses" ADD CONSTRAINT "wedding_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_expenses" ADD CONSTRAINT "wedding_expenses_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "wedding_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_budgets" ADD CONSTRAINT "wedding_budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
