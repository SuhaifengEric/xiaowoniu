CREATE UNIQUE INDEX "fitness_goals_one_active_per_user" ON "fitness_goals"("user_id") WHERE "is_active" = true;
