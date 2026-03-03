-- Stripe billing: add subscriptions, user_entitlements tables + stripeCustomerId to users
-- Migration is idempotent: safe to run multiple times

-- Step 1: Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_subscription_id" text,
	"stripe_product_id" text,
	"stripe_price_id" text,
	"status" text NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint

-- Step 2: Create user_entitlements table
CREATE TABLE IF NOT EXISTS "user_entitlements" (
	"user_id" uuid NOT NULL,
	"lookup_key" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_entitlements_user_id_lookup_key_pk" PRIMARY KEY("user_id","lookup_key")
);
--> statement-breakpoint

-- Step 3: Add stripe_customer_id to users (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;
  END IF;
END $$;
--> statement-breakpoint

-- Step 4: Add FK on subscriptions (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'subscriptions_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

-- Step 5: Add FK on user_entitlements (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'user_entitlements_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "user_entitlements" ADD CONSTRAINT "user_entitlements_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

-- Step 6: Add unique constraint on stripe_customer_id (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'users_stripe_customer_id_unique'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id");
  END IF;
END $$;
