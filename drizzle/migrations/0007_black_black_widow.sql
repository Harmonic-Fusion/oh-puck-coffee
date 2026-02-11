ALTER TABLE "shots" ALTER COLUMN "shot_quality" SET DATA TYPE numeric(3, 1);--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "is_roast_date_best_guess" boolean DEFAULT false NOT NULL;