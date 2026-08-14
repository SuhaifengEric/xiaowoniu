-- Stage A migration reconciliation.
-- Expected result: zero rows. Run before and after applying the migration
-- against the same database while saving_plans.current_amount is retained.
SELECT
    sp."id" AS "saving_plan_id",
    sp."current_amount" AS "legacy_current_amount",
    COALESCE(SUM(sd."amount"), 0) AS "deposit_total"
FROM "saving_plans" sp
LEFT JOIN "saving_deposits" sd ON sd."saving_plan_id" = sp."id"
GROUP BY sp."id", sp."current_amount"
HAVING COALESCE(SUM(sd."amount"), 0) <> sp."current_amount";

-- Expected result: every positive legacy amount has exactly one legacy_import
-- row, and zero legacy amounts have none.
SELECT
    sp."id" AS "saving_plan_id",
    sp."current_amount",
    COUNT(sd."id") FILTER (WHERE sd."source" = 'legacy_import') AS "legacy_import_count"
FROM "saving_plans" sp
LEFT JOIN "saving_deposits" sd ON sd."saving_plan_id" = sp."id"
GROUP BY sp."id", sp."current_amount"
HAVING COUNT(sd."id") FILTER (WHERE sd."source" = 'legacy_import') <> CASE WHEN sp."current_amount" > 0 THEN 1 ELSE 0 END;
