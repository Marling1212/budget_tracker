-- Change monthly_budget to daily_budget
ALTER TABLE "public"."categories" RENAME COLUMN "monthly_budget" TO "daily_budget";
