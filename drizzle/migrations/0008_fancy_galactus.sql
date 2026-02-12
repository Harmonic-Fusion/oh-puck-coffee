ALTER TABLE "shots" ALTER COLUMN "brew_time_secs" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "yield_actual_grams" numeric(5, 1);