-- Additive migration for the first version of the 嫁嫁嫁 marriage process.
-- Existing wedding tasks, expenses and budgets remain intact.

ALTER TABLE "wedding_tasks"
    ADD COLUMN "process_id" TEXT,
    ADD COLUMN "stage_key" VARCHAR(32),
    ADD COLUMN "owner_role" VARCHAR(32),
    ADD COLUMN "completion_criteria" VARCHAR(500);

CREATE TABLE "marriage_processes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recorder_role" VARCHAR(32) NOT NULL,
    "visit_order" VARCHAR(32) NOT NULL DEFAULT 'male_first',
    "marriage_order" VARCHAR(32) NOT NULL DEFAULT 'registration_first',
    "engagement_mode" VARCHAR(32) NOT NULL DEFAULT 'undecided',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marriage_processes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marriage_nodes" (
    "id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "node_key" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'not_started',
    "planned_date" DATE,
    "actual_date" DATE,
    "participants" VARCHAR(500),
    "conclusion" TEXT,
    "disagreements" TEXT,
    "next_step" TEXT,
    "notes" TEXT,
    "skip_reason" VARCHAR(500),
    "backfilled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marriage_nodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agreement_topics" (
    "id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'not_discussed',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreement_topics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marriage_node_histories" (
    "id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "from_status" VARCHAR(32),
    "to_status" VARCHAR(32),
    "from_planned_date" DATE,
    "to_planned_date" DATE,
    "from_actual_date" DATE,
    "to_actual_date" DATE,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marriage_node_histories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marriage_processes_user_id_key" ON "marriage_processes"("user_id");
CREATE UNIQUE INDEX "marriage_nodes_process_id_node_key_key" ON "marriage_nodes"("process_id", "node_key");
CREATE INDEX "wedding_tasks_process_id_stage_key_planned_date_idx" ON "wedding_tasks"("process_id", "stage_key", "planned_date");
CREATE INDEX "marriage_nodes_process_id_status_planned_date_idx" ON "marriage_nodes"("process_id", "status", "planned_date");
CREATE INDEX "agreement_topics_process_id_archived_at_sort_order_idx" ON "agreement_topics"("process_id", "archived_at", "sort_order");
CREATE INDEX "marriage_node_histories_process_id_node_id_created_at_idx" ON "marriage_node_histories"("process_id", "node_id", "created_at");

ALTER TABLE "wedding_tasks" ADD CONSTRAINT "wedding_tasks_process_id_fkey"
    FOREIGN KEY ("process_id") REFERENCES "marriage_processes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "marriage_processes" ADD CONSTRAINT "marriage_processes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marriage_nodes" ADD CONSTRAINT "marriage_nodes_process_id_fkey"
    FOREIGN KEY ("process_id") REFERENCES "marriage_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agreement_topics" ADD CONSTRAINT "agreement_topics_process_id_fkey"
    FOREIGN KEY ("process_id") REFERENCES "marriage_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marriage_node_histories" ADD CONSTRAINT "marriage_node_histories_process_id_fkey"
    FOREIGN KEY ("process_id") REFERENCES "marriage_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marriage_node_histories" ADD CONSTRAINT "marriage_node_histories_node_id_fkey"
    FOREIGN KEY ("node_id") REFERENCES "marriage_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
