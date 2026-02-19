ALTER TABLE "shots" ALTER COLUMN "grind_level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shots" ALTER COLUMN "flow_rate" SET DATA TYPE numeric(5, 2);