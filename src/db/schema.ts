import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ============ Auth.js Tables ============

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: text("role").$type<"member" | "admin">().default("member").notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

// ============ Domain Tables ============

export const beans = pgTable("beans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  origin: text("origin"),
  roaster: text("roaster"),
  processingMethod: text("processing_method"),
  roastLevel: text("roast_level").notNull(),
  roastDate: timestamp("roast_date", { mode: "date" }),
  isRoastDateBestGuess: boolean("is_roast_date_best_guess").default(false).notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const grinders = pgTable("grinders", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const machines = pgTable("machines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const tools = pgTable("tools", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const shots = pgTable("shots", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Foreign keys
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  beanId: uuid("bean_id")
    .notNull()
    .references(() => beans.id, { onDelete: "cascade" }),
  grinderId: uuid("grinder_id")
    .notNull()
    .references(() => grinders.id),
  machineId: uuid("machine_id").references(() => machines.id),
  // Recipe
  doseGrams: numeric("dose_grams", { precision: 5, scale: 1 }).notNull(),
  yieldGrams: numeric("yield_grams", { precision: 5, scale: 1 }).notNull(),
  grindLevel: numeric("grind_level", { precision: 6, scale: 2 }).notNull(),
  brewTimeSecs: numeric("brew_time_secs", { precision: 5, scale: 1 }).notNull(),
  brewTempC: numeric("brew_temp_c", { precision: 4, scale: 1 }),
  preInfusionDuration: numeric("pre_infusion_duration", { precision: 5, scale: 1 }),
  brewPressure: numeric("brew_pressure", { precision: 4, scale: 1 }).default("9"),
  // Computed (stored on write)
  flowRate: numeric("flow_rate", { precision: 4, scale: 2 }),
  // Subjective
  shotQuality: numeric("shot_quality", { precision: 3, scale: 1 }).notNull(), // 1-5 with 0.5 steps
  toolsUsed: jsonb("tools_used").$type<string[]>(),
  notes: text("notes"),
  // Flavor Wheel (all optional)
  flavorWheelCategories: jsonb("flavor_wheel_categories").$type<Record<string, string[]>>(),
  flavorWheelBody: text("flavor_wheel_body"),
  flavorWheelAdjectives: jsonb("flavor_wheel_adjectives").$type<string[]>(),
  // Meta
  isReferenceShot: boolean("is_reference_shot").default(false).notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const integrations = pgTable("integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // "google_sheets"
  spreadsheetId: text("spreadsheet_id"),
  spreadsheetName: text("spreadsheet_name"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
