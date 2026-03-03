ALTER TABLE "feedback" ADD COLUMN "status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "priority" integer;