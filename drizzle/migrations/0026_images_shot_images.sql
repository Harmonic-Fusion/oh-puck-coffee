-- Generic `images` table + `shot_images` join. Idempotent: safe if tables/constraints already exist.

CREATE TABLE IF NOT EXISTS "images" (
  "id" text PRIMARY KEY NOT NULL,
  "url" text NOT NULL,
  "thumbnail" bytea NOT NULL,
  "size_bytes" integer NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shot_images" (
  "shot_id" text NOT NULL,
  "image_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "shot_images_shot_id_image_id_pk" PRIMARY KEY ("shot_id", "image_id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'images_user_id_users_id_fk') THEN
    ALTER TABLE "images" ADD CONSTRAINT "images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shot_images_shot_id_shots_id_fk') THEN
    ALTER TABLE "shot_images" ADD CONSTRAINT "shot_images_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "public"."shots"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shot_images_image_id_images_id_fk') THEN
    ALTER TABLE "shot_images" ADD CONSTRAINT "shot_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
