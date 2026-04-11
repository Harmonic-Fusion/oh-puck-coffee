import * as z from "zod";

// ============ Unified equipment types ============

export const equipmentTypeSchema = z.enum([
  "grinder",
  "machine",
  "tool",
  "kettle",
  "scale",
  "pour_over",
  "french_press",
  "moka_pot",
  "cold_brew",
]);
export type EquipmentType = z.infer<typeof equipmentTypeSchema>;

/** Brew gear beyond grinder/machine — user collection + catalog use `/api/equipment/items`. */
export const USER_GEAR_EXTRA_TYPES = [
  "kettle",
  "scale",
  "pour_over",
  "french_press",
  "moka_pot",
  "cold_brew",
] as const;
export type UserGearExtraType = (typeof USER_GEAR_EXTRA_TYPES)[number];
export const userGearExtraTypeSchema = z.enum(USER_GEAR_EXTRA_TYPES);

/** All types shown on the user &quot;My equipment&quot; gear section (excludes `tool`). */
export const USER_GEAR_TYPES = [
  "grinder",
  "machine",
  ...USER_GEAR_EXTRA_TYPES,
] as const;
export type UserGearType = (typeof USER_GEAR_TYPES)[number];

/** Labels for admin UI type pickers (single source for filters and create/search modals). */
export const ADMIN_EQUIPMENT_TYPE_OPTIONS: { value: EquipmentType; label: string }[] = [
  { value: "grinder", label: "Grinder" },
  { value: "machine", label: "Espresso machine" },
  { value: "tool", label: "Tool" },
  { value: "kettle", label: "Kettle" },
  { value: "scale", label: "Scale" },
  { value: "pour_over", label: "Pour over" },
  { value: "french_press", label: "French press" },
  { value: "moka_pot", label: "Moka pot" },
  { value: "cold_brew", label: "Cold brew" },
];

/** Lenient JSON object for type-specific equipment attributes stored in `equipment.specs`. */
export const equipmentSpecsSchema = z.record(z.string(), z.unknown());
export type EquipmentSpecs = z.infer<typeof equipmentSpecsSchema>;

/** Top-level keys in `specs` whose JSON values are not `null`. */
export function countNonNullSpecValues(specs: unknown): number {
  if (specs == null || typeof specs !== "object" || Array.isArray(specs)) return 0;
  return Object.values(specs as Record<string, unknown>).filter((v) => v != null).length;
}

// ─── Grinder (inner specs) ───────────────────────────────────────────────────

export const GrinderSpecsFieldsSchema = z.object({
  type: z.enum(["flat_burr", "conical_burr", "blade"]).describe(
    "Burr geometry. Flat burrs produce a more uniform grind size distribution; conical burrs tend to retain less and run quieter; blade grinders produce inconsistent particle size",
  ),
  burr_size_mm: z.number().positive().optional().describe(
    "Burr diameter in millimeters. Larger burrs generally produce less heat and allow faster grinding",
  ),
  burr_material: z.enum(["steel", "ceramic", "titanium_coated"]).optional().describe(
    "Material the burr cutting surfaces are made from. Steel is most common; ceramic runs cooler; titanium-coated extends burr life",
  ),
  motor_rpm: z.number().int().positive().optional().describe(
    "Motor speed in RPM. Electric grinders only — omit for hand grinders. Lower RPM generates less heat and noise",
  ),
  motor_wattage: z.number().int().positive().optional().describe(
    "Motor power in watts. Electric grinders only — omit for hand grinders",
  ),
  motor_type: z.enum(["AC", "DC", "brushless_DC"]).optional().describe(
    "Motor technology. Electric grinders only. Brushless DC motors are quieter and more durable; AC motors are common in commercial equipment",
  ),
  adjustment_mechanism: z
    .enum(["external_dial", "internal", "top_cap"])
    .describe(
      "How grind setting is changed. External dial is most convenient; internal requires removing the hopper; top-cap is common on hand grinders",
    ),
  stepless: z.boolean().describe(
    "True if grind adjustment is continuous with no fixed click positions. Stepless offers more precision; stepped is more repeatable",
  ),
  grind_steps: z.number().int().positive().optional().describe(
    "Number of discrete grind positions. Omit if stepless is true",
  ),
  grind_min: z.string().optional().describe(
    "Finest grind setting label or number as marked on the grinder",
  ),
  grind_max: z.string().optional().describe(
    "Coarsest grind setting label or number as marked on the grinder",
  ),
  retention_g: z.number().nonnegative().optional().describe(
    "Typical grounds retained inside the grinder in grams, measured under standard single-dose conditions",
  ),
  grind_speed_g_per_sec: z.number().positive().optional().describe(
    "Output rate in grams per second. Where possible, measured at an espresso grind setting with an 18g dose",
  ),
  noise_db: z.number().positive().optional().describe(
    "Noise level in decibels, measured or as reported by manufacturer",
  ),
  hopper_capacity_g: z.number().positive().optional().describe(
    "Maximum bean hopper capacity in grams",
  ),
  single_dose_friendly: z.boolean().describe(
    "True if the grinder is designed or well-suited for loading one dose at a time rather than keeping beans in the hopper",
  ),
});

const grinderSharedSpecsSchema = z.object({
  form_factor: z.enum(["hand", "electric_countertop", "commercial"]).optional().describe(
    "Physical format of the grinder",
  ),
  intended_use: z.enum(["espresso", "filter", "omni"]).optional().describe(
    "Primary brew target. Omit for equipment that does not grind (kettles, scales, etc.)",
  ),
  weight_kg: z.number().positive().optional().describe("Unit weight in kilograms"),
  dimensions: z.string().optional().describe("Overall dimensions as 'W x D x H mm'"),
  wattage: z.number().int().positive().optional().describe(
    "Power draw in watts. Omit for non-electric equipment",
  ),
  voltage: z.enum(["110V", "220V", "dual"]).optional().describe(
    "Electrical compatibility. Omit for non-electric equipment",
  ),
  notes: z.string().optional().describe("Freeform observations, caveats, or sourcing notes"),
});

/** Stored in `equipment.specs` for `type === \"grinder\"` (all fields optional for admin entry). */
export const grinderSpecsSchema = GrinderSpecsFieldsSchema.merge(grinderSharedSpecsSchema).partial();

export type GrinderSpecs = z.infer<typeof grinderSpecsSchema>;

// ─── Espresso machine (DB type `machine`) ────────────────────────────────────

export const EspressoMachineSpecsSchema = z.object({
  type: z.enum([
    "single_boiler",
    "thermocoil",
    "thermoblock",
    "heat_exchanger",
    "dual_boiler",
    "lever",
  ]).describe(
    "Boiler/thermal configuration. Single boiler switches between brew and steam temps; thermocoil/thermoblock heat water on demand; heat exchanger brews and steams simultaneously from one boiler; dual boiler has independent brew and steam boilers; lever uses manual or spring pressure",
  ),
  boiler_material: z.enum(["brass", "stainless", "aluminum"]).optional().describe(
    "Material the boiler is constructed from. Brass retains heat well; stainless is corrosion-resistant; aluminum is lightweight but less durable",
  ),
  boiler_size_ml: z.number().int().positive().optional().describe(
    "Boiler capacity in ml. For single boiler machines only — omit for dual boiler",
  ),
  brew_boiler_size_ml: z.number().int().positive().optional().describe(
    "Brew boiler capacity in ml. Dual boiler machines only",
  ),
  steam_boiler_size_ml: z.number().int().positive().optional().describe(
    "Steam boiler capacity in ml. Dual boiler machines only",
  ),
  pid_controlled: z.boolean().describe(
    "True if the machine uses a PID controller to maintain precise brew temperature",
  ),
  pump_type: z.enum(["vibratory", "rotary"]).optional().describe(
    "Pump mechanism. Vibratory pumps are smaller and cheaper but noisier; rotary pumps are quieter, more consistent, and support plumbing",
  ),
  max_pressure_bar: z.number().positive().optional().describe(
    "Maximum pump pressure in bar. Espresso typically targets 9 bar",
  ),
  pressure_profiling: z.boolean().describe(
    "True if the machine supports variable pressure during extraction",
  ),
  flow_control: z.boolean().describe(
    "True if the machine supports manual flow rate control during extraction, independent of pressure",
  ),
  pre_infusion: z.boolean().describe(
    "True if the machine supports pre-infusion — wetting the puck at low pressure before full extraction",
  ),
  pre_infusion_type: z.enum(["mechanical", "electronic", "flow_control"]).optional().describe(
    "How pre-infusion is implemented. Omit if pre_infusion is false",
  ),
  shot_timer: z.boolean().describe(
    "True if the machine has a built-in shot timer display",
  ),
  programmable_volumes: z.boolean().describe(
    "True if shot volumes can be programmed via volumetric dosing",
  ),
  steam_wand_type: z.enum(["single_hole", "multi_hole", "auto_frothing"]).optional().describe(
    "Steam delivery mechanism. Single hole requires more skill; multi-hole is easier for microfoam; auto-frothing is automated",
  ),
  hot_water_spout: z.boolean().describe(
    "True if the machine has a dedicated hot water dispenser for Americanos or tea",
  ),
  water_reservoir_ml: z.number().int().positive().optional().describe(
    "Removable water reservoir capacity in ml. Omit if the machine is plumbed-in only",
  ),
  plumb_in: z.boolean().describe(
    "True if the machine supports direct plumbing to a water line",
  ),
  portafilter_size_mm: z.number().int().positive().optional().describe(
    "Portafilter basket diameter in mm. 58mm is the industry standard for prosumer/commercial machines",
  ),
  heating_time_minutes: z.number().positive().optional().describe(
    "Typical time from cold start to brew-ready in minutes",
  ),
});

const machineSharedSpecsSchema = z.object({
  form_factor: z.enum(["home", "prosumer", "commercial"]).optional().describe(
    "Intended market tier for the espresso machine",
  ),
  intended_use: z.enum(["espresso", "filter", "omni"]).optional(),
  weight_kg: z.number().positive().optional().describe("Unit weight in kilograms"),
  dimensions: z.string().optional().describe("Overall dimensions as 'W x D x H mm'"),
  wattage: z.number().int().positive().optional().describe(
    "Power draw in watts. Omit for non-electric equipment",
  ),
  voltage: z.enum(["110V", "220V", "dual"]).optional().describe(
    "Electrical compatibility. Omit for non-electric equipment",
  ),
  notes: z.string().optional().describe("Freeform observations, caveats, or sourcing notes"),
});

/** Stored in `equipment.specs` for `type === \"machine\"` (all fields optional for admin entry). */
export const machineSpecsSchema = EspressoMachineSpecsSchema.merge(machineSharedSpecsSchema).partial();

export type MachineSpecs = z.infer<typeof machineSpecsSchema>;

// ─── Tool (generic accessories) ──────────────────────────────────────────────

export const toolSpecsSchema = z.object({
  material: z.string().optional(),
  compatible_portafilter_mm: z.number().optional(),
  diameter_mm: z.number().optional(),
});

export type ToolSpecs = z.infer<typeof toolSpecsSchema>;

// ─── Kettle ───────────────────────────────────────────────────────────────────

export const KettleSpecsSchema = z.object({
  gooseneck: z.boolean().describe(
    "True if the kettle has a gooseneck spout for precise pour control, essential for pour over brewing",
  ),
  temp_control: z.enum(["none", "preset", "variable"]).describe(
    "Temperature control capability. None = boil only; preset = fixed temperature options; variable = dial or slider to any temperature",
  ),
  hold_temp_capable: z.boolean().describe(
    "True if the kettle can maintain a set temperature for an extended period after reaching it",
  ),
  capacity_ml: z.number().int().positive().describe(
    "Maximum water capacity in ml",
  ),
});

const kettleSharedSpecsSchema = z.object({
  form_factor: z.enum(["home", "commercial"]).optional().describe(
    "Intended market tier for the kettle",
  ),
  intended_use: z.enum(["espresso", "filter", "omni"]).optional(),
  weight_kg: z.number().positive().optional(),
  dimensions: z.string().optional(),
  wattage: z.number().int().positive().optional(),
  voltage: z.enum(["110V", "220V", "dual"]).optional(),
  notes: z.string().optional(),
});

export const kettleSpecsSchema = KettleSpecsSchema.merge(kettleSharedSpecsSchema).partial();
export type KettleSpecs = z.infer<typeof kettleSpecsSchema>;

// ─── Scale ────────────────────────────────────────────────────────────────────

export const ScaleSpecsSchema = z.object({
  response_time_ms: z.number().int().positive().optional().describe(
    "Time in milliseconds between a weight change and the display updating. Critical for espresso where shot weight changes rapidly",
  ),
  max_weight_g: z.number().int().positive().optional().describe(
    "Maximum weighing capacity in grams",
  ),
  precision_g: z.number().positive().optional().describe(
    "Smallest measurable increment in grams (e.g. 0.1 or 0.01)",
  ),
  bluetooth: z.boolean().describe(
    "True if the scale has Bluetooth connectivity",
  ),
  app_integration: z.boolean().describe(
    "True if the scale has a companion app for logging or profiling",
  ),
  auto_tare: z.boolean().describe(
    "True if the scale automatically tares when a vessel is placed on it",
  ),
  timer_builtin: z.boolean().describe(
    "True if the scale has a built-in shot timer",
  ),
});

const scaleSharedSpecsSchema = z.object({
  form_factor: z.enum(["home", "commercial"]).optional().describe(
    "Intended market tier for the scale",
  ),
  intended_use: z.enum(["espresso", "filter", "omni"]).optional(),
  weight_kg: z.number().positive().optional(),
  dimensions: z.string().optional(),
  wattage: z.number().int().positive().optional(),
  voltage: z.enum(["110V", "220V", "dual"]).optional(),
  notes: z.string().optional(),
});

export const scaleSpecsSchema = ScaleSpecsSchema.merge(scaleSharedSpecsSchema).partial();
export type ScaleSpecs = z.infer<typeof scaleSpecsSchema>;

// ─── Pour over ────────────────────────────────────────────────────────────────

export const PourOverSpecsSchema = z.object({
  material: z.enum(["ceramic", "glass", "plastic", "metal"]).describe(
    "Dripper body material. Ceramic retains heat best; glass allows visual monitoring; plastic is lightweight and durable; metal is lightweight and fast-heating",
  ),
  flow_rate: z.enum(["slow", "medium", "fast"]).describe(
    "Relative flow rate through the dripper. Slow allows more contact time and suits lighter roasts; fast drains quickly and suits darker roasts or immersion-hybrid designs",
  ),
  filter_type: z.enum(["paper", "metal", "cloth"]).describe(
    "Compatible filter medium. Paper filters out oils for a clean cup; metal passes oils for a fuller body; cloth is reusable and produces a cup between paper and metal",
  ),
  capacity_ml: z.number().int().positive().optional().describe(
    "Maximum brew capacity in ml",
  ),
});

const pourOverSharedSpecsSchema = z.object({
  form_factor: z.enum(["home", "cafe"]).optional().describe(
    "Intended use context for the pour over dripper",
  ),
  intended_use: z.enum(["espresso", "filter", "omni"]).optional(),
  weight_kg: z.number().positive().optional(),
  dimensions: z.string().optional(),
  notes: z.string().optional(),
});

export const pourOverSpecsSchema = PourOverSpecsSchema.merge(pourOverSharedSpecsSchema).partial();
export type PourOverSpecs = z.infer<typeof pourOverSpecsSchema>;

// ─── French press ─────────────────────────────────────────────────────────────

export const FrenchPressSpecsSchema = z.object({
  capacity_ml: z.number().int().positive().describe(
    "Total liquid capacity in ml",
  ),
  material: z.enum(["glass", "stainless", "plastic"]).describe(
    "Carafe body material. Glass allows visual monitoring but is fragile; stainless retains heat and is durable; plastic is lightweight",
  ),
  mesh_gauge: z.string().optional().describe(
    "Filter mesh specification (e.g. '150 micron', 'double mesh'). Finer mesh reduces sediment in the cup",
  ),
});

const frenchPressSharedSpecsSchema = z.object({
  form_factor: z.enum(["home", "travel", "commercial"]).optional().describe(
    "Intended use context for the french press",
  ),
  intended_use: z.enum(["espresso", "filter", "omni"]).optional(),
  weight_kg: z.number().positive().optional(),
  dimensions: z.string().optional(),
  notes: z.string().optional(),
});

export const frenchPressSpecsSchema = FrenchPressSpecsSchema.merge(frenchPressSharedSpecsSchema).partial();
export type FrenchPressSpecs = z.infer<typeof frenchPressSpecsSchema>;

// ─── Moka pot ─────────────────────────────────────────────────────────────────

export const MokaPotSpecsSchema = z.object({
  capacity_cups: z.number().int().positive().describe(
    "Number of espresso-sized cups the pot produces per brew. Note: moka pot 'cups' are approximately 50ml, not standard espresso doses",
  ),
  material: z.enum(["aluminum", "stainless"]).describe(
    "Pot body material. Aluminum is traditional and heats faster; stainless is more durable, dishwasher-safe, and induction-compatible",
  ),
  induction_compatible: z.boolean().describe(
    "True if the pot works on induction cooktops. Stainless pots are typically induction-compatible; aluminum pots are not",
  ),
});

const mokaPotSharedSpecsSchema = z.object({
  form_factor: z.enum(["home", "camping", "commercial"]).optional().describe(
    "Intended use context for the moka pot",
  ),
  intended_use: z.enum(["espresso", "filter", "omni"]).optional(),
  weight_kg: z.number().positive().optional(),
  dimensions: z.string().optional(),
  notes: z.string().optional(),
});

export const mokaPotSpecsSchema = MokaPotSpecsSchema.merge(mokaPotSharedSpecsSchema).partial();
export type MokaPotSpecs = z.infer<typeof mokaPotSpecsSchema>;

// ─── Cold brew ────────────────────────────────────────────────────────────────

export const ColdBrewSpecsSchema = z.object({
  method: z.enum(["immersion", "drip_tower"]).describe(
    "Brewing method. Immersion steeps grounds in cold water then filters; drip tower slowly drips cold water through grounds over many hours",
  ),
  capacity_ml: z.number().int().positive().describe(
    "Total brew capacity in ml",
  ),
  steep_time_min_hours: z.number().positive().optional().describe(
    "Minimum recommended steep or drip time in hours",
  ),
  steep_time_max_hours: z.number().positive().optional().describe(
    "Maximum recommended steep or drip time in hours",
  ),
});

const coldBrewSharedSpecsSchema = z.object({
  form_factor: z.enum(["home", "commercial"]).optional().describe(
    "Intended use context for the cold brew maker",
  ),
  intended_use: z.enum(["espresso", "filter", "omni"]).optional(),
  weight_kg: z.number().positive().optional(),
  dimensions: z.string().optional(),
  notes: z.string().optional(),
});

export const coldBrewSpecsSchema = ColdBrewSpecsSchema.merge(coldBrewSharedSpecsSchema).partial();
export type ColdBrewSpecs = z.infer<typeof coldBrewSpecsSchema>;

// ─── Lookups & unions ───────────────────────────────────────────────────────

/** Lookup: equipment type → Zod object schema for admin specs form (all keys optional). */
export const specsByType = {
  grinder: grinderSpecsSchema,
  machine: machineSpecsSchema,
  tool: toolSpecsSchema,
  kettle: kettleSpecsSchema,
  scale: scaleSpecsSchema,
  pour_over: pourOverSpecsSchema,
  french_press: frenchPressSpecsSchema,
  moka_pot: mokaPotSpecsSchema,
  cold_brew: coldBrewSpecsSchema,
} as const;

/**
 * Strict inner specs only (no shared tier fields), keyed by API type.
 * `machine` corresponds to espresso machines (`EspressoMachineSpecsSchema`).
 */
export const EQUIPMENT_TYPE_SCHEMAS = {
  grinder: GrinderSpecsFieldsSchema,
  machine: EspressoMachineSpecsSchema,
  kettle: KettleSpecsSchema,
  scale: ScaleSpecsSchema,
  pour_over: PourOverSpecsSchema,
  french_press: FrenchPressSpecsSchema,
  moka_pot: MokaPotSpecsSchema,
  cold_brew: ColdBrewSpecsSchema,
} as const;

export type EquipmentTypeName = keyof typeof EQUIPMENT_TYPE_SCHEMAS;

export type CatalogEquipmentSpecsInner =
  | z.infer<typeof GrinderSpecsFieldsSchema>
  | z.infer<typeof EspressoMachineSpecsSchema>
  | z.infer<typeof KettleSpecsSchema>
  | z.infer<typeof ScaleSpecsSchema>
  | z.infer<typeof PourOverSpecsSchema>
  | z.infer<typeof FrenchPressSpecsSchema>
  | z.infer<typeof MokaPotSpecsSchema>
  | z.infer<typeof ColdBrewSpecsSchema>;

/** Query param for `GET /api/equipment/*` list endpoints. */
export const equipmentListScopeSchema = z.enum(["mine", "all"]);

export type EquipmentListScope = z.infer<typeof equipmentListScopeSchema>;

export const createGrinderSchema = z.object({
  name: z.string().min(1, "Grinder name is required"),
});

export const createMachineSchema = z.object({
  name: z.string().min(1, "Machine name is required"),
});

export const createToolSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens"),
  description: z.string().optional(),
});

/** POST `/api/equipment/my/grinders` — add an existing grinder or create a personal one. */
export const myGrinderCollectionBodySchema = z
  .object({
    grinderId: z.string().min(1).optional(),
    name: z.string().min(1, "Grinder name is required").optional(),
    /** Only when creating by `name`; ignored for `grinderId` adds. */
    brand: z.string().max(200).optional(),
    /** Only when creating by `name`; validated against grinder specs schema. */
    specs: z.record(z.string(), z.unknown()).optional(),
    /** Only when creating by `name`; must be an image uploaded by the user. */
    imageId: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    const hasId = Boolean(val.grinderId?.trim());
    const hasName = Boolean(val.name?.trim());
    if (hasId === hasName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of grinderId or name",
        path: ["grinderId"],
      });
    }
    if (hasId && val.brand !== undefined && String(val.brand).trim() !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "brand is only allowed when creating a grinder by name",
        path: ["brand"],
      });
    }
    if (hasId && val.specs !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "specs is only allowed when creating a grinder by name",
        path: ["specs"],
      });
    }
    if (hasId && val.imageId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "imageId is only allowed when creating a grinder by name",
        path: ["imageId"],
      });
    }
  });

/** POST `/api/equipment/my/machines` — add an existing machine or create a personal one. */
export const myMachineCollectionBodySchema = z
  .object({
    machineId: z.string().min(1).optional(),
    name: z.string().min(1, "Machine name is required").optional(),
    /** Only when creating by `name`; ignored for `machineId` adds. */
    brand: z.string().max(200).optional(),
    specs: z.record(z.string(), z.unknown()).optional(),
    /** Only when creating by `name`; must be an image uploaded by the user. */
    imageId: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    const hasId = Boolean(val.machineId?.trim());
    const hasName = Boolean(val.name?.trim());
    if (hasId === hasName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of machineId or name",
        path: ["machineId"],
      });
    }
    if (hasId && val.brand !== undefined && String(val.brand).trim() !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "brand is only allowed when creating a machine by name",
        path: ["brand"],
      });
    }
    if (hasId && val.specs !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "specs is only allowed when creating a machine by name",
        path: ["specs"],
      });
    }
    if (hasId && val.imageId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "imageId is only allowed when creating a machine by name",
        path: ["imageId"],
      });
    }
  });

/** POST `/api/equipment/my/tools` — add a catalog tool to the user's collection. */
export const myToolCollectionBodySchema = z.object({
  toolId: z.string().min(1),
});

/** POST `/api/equipment/my/items` — add extra brew gear (kettle, scale, …) or create by name. */
export const myGenericGearCollectionBodySchema = z
  .object({
    equipmentType: userGearExtraTypeSchema,
    equipmentId: z.string().min(1).optional(),
    name: z.string().min(1, "Name is required").optional(),
    brand: z.string().max(200).optional(),
    specs: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    const hasId = Boolean(val.equipmentId?.trim());
    const hasName = Boolean(val.name?.trim());
    if (hasId === hasName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of equipmentId or name",
        path: ["equipmentId"],
      });
    }
    if (hasId && val.brand !== undefined && String(val.brand).trim() !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "brand is only allowed when creating by name",
        path: ["brand"],
      });
    }
    if (hasId && val.specs !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "specs is only allowed when creating by name",
        path: ["specs"],
      });
    }
  });

/** PATCH user equipment: image, visibility (staff), name/brand/specs (owner or staff). */
export const patchUserEquipmentBodySchema = z
  .object({
    imageId: z.string().min(1).nullable().optional(),
    isGlobal: z.boolean().optional(),
    name: z.string().min(1).optional(),
    brand: z.string().max(200).nullable().optional(),
    specs: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine(
    (b) =>
      b.imageId !== undefined ||
      b.isGlobal !== undefined ||
      b.name !== undefined ||
      b.brand !== undefined ||
      b.specs !== undefined,
    { message: "Provide at least one field to update" },
  );

/** @deprecated Alias for `patchUserEquipmentBodySchema`. */
export const patchEquipmentRowBodySchema = patchUserEquipmentBodySchema;

/** POST `/api/admin/equipment` — create a unified equipment row (super-admin). */
export const adminCreateEquipmentBodySchema = z
  .object({
    type: equipmentTypeSchema,
    name: z.string().min(1),
    brand: z.string().nullable().optional(),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens")
      .nullable()
      .optional(),
    description: z.string().nullable().optional(),
    specs: equipmentSpecsSchema.nullable().optional(),
    isGlobal: z.boolean().optional(),
    adminApproved: z.boolean().optional(),
    imageId: z.string().min(1).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "tool") {
      const s = val.slug;
      if (s == null || String(s).trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Slug is required for tools",
          path: ["slug"],
        });
      }
    }
  });

/** PATCH /api/admin/equipment/:id — super-admin full edit on unified equipment rows. */
export const adminPatchEquipmentBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    brand: z.string().nullable().optional(),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens")
      .nullable()
      .optional(),
    description: z.string().nullable().optional(),
    specs: equipmentSpecsSchema.nullable().optional(),
    isGlobal: z.boolean().optional(),
    adminApproved: z.boolean().optional(),
    imageId: z.string().min(1).nullable().optional(),
  })
  .refine(
    (b) =>
      b.name !== undefined ||
      b.brand !== undefined ||
      b.slug !== undefined ||
      b.description !== undefined ||
      b.specs !== undefined ||
      b.isGlobal !== undefined ||
      b.adminApproved !== undefined ||
      b.imageId !== undefined,
    { message: "Provide at least one field to update" },
  );

export const grinderSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  brand: z.string().nullable(),
  specs: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.coerce.date(),
  createdBy: z.string().nullable(),
  isGlobal: z.boolean(),
  imageUrl: z.string().min(1).nullable(),
  thumbnailBase64: z.string().min(1).nullable(),
  lastUsedAt: z.coerce.date().nullable().optional(),
});

export const machineSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  brand: z.string().nullable(),
  specs: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.coerce.date(),
  createdBy: z.string().nullable(),
  isGlobal: z.boolean(),
  imageUrl: z.string().min(1).nullable(),
  thumbnailBase64: z.string().min(1).nullable(),
  lastUsedAt: z.coerce.date().nullable().optional(),
});

export const toolSchema = z.object({
  id: z.string().min(1),
  slug: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  description: z.string().nullable(),
  specs: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.coerce.date(),
  createdBy: z.string().nullable(),
  isGlobal: z.boolean(),
  imageUrl: z.string().min(1).nullable(),
  thumbnailBase64: z.string().min(1).nullable(),
});

export type CreateGrinder = z.infer<typeof createGrinderSchema>;
export type CreateMachine = z.infer<typeof createMachineSchema>;
export type CreateTool = z.infer<typeof createToolSchema>;
export type Grinder = z.infer<typeof grinderSchema>;
export type Machine = z.infer<typeof machineSchema>;
export type Tool = z.infer<typeof toolSchema>;

// ============ Admin purchase links (super-admin API) ============

/** POST `/api/admin/equipment/:id/links` — `approved` sets `approvedByUserId` to the current super-admin or clears it. */
export const adminCreatePurchaseLinkBodySchema = z.object({
  marketplace: z.string().min(1),
  baseUrl: z.string().min(1).url(),
  affiliateProgram: z.string().nullable().optional(),
  affiliateTag: z.string().nullable().optional(),
  priceUsd: z.number().nonnegative().nullable().optional(),
  region: z.string().min(1).optional(),
  isCanonical: z.boolean().optional(),
  approved: z.boolean().optional(),
});

/** PATCH `/api/admin/equipment/links/:linkId` — same `approved` semantics; do not send `approvedByUserId` (server-owned). */
export const adminPatchPurchaseLinkBodySchema = z
  .object({
    marketplace: z.string().min(1).optional(),
    baseUrl: z.string().min(1).url().optional(),
    affiliateProgram: z.string().nullable().optional(),
    affiliateTag: z.string().nullable().optional(),
    priceUsd: z.number().nonnegative().nullable().optional(),
    region: z.string().min(1).optional(),
    isCanonical: z.boolean().optional(),
    lastVerifiedAt: z.coerce.date().nullable().optional(),
    deactivatedAt: z.coerce.date().nullable().optional(),
    approved: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "Provide at least one field to update",
  });

// ============ Admin AI equipment search ============

export const adminEquipmentSearchRequestSchema = z.object({
  type: equipmentTypeSchema,
  count: z.number().int().min(1).max(20).default(5),
  brand: z.string().optional(),
  context: z.string().optional(),
});

/** Validated suggestion from `POST /api/admin/equipment/search` (not persisted). */
export const adminAiEquipmentCandidateSchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  type: equipmentTypeSchema,
  description: z.string().nullable().optional(),
  specs: equipmentSpecsSchema.optional(),
});

/** Response body from `POST /api/admin/equipment/search`. */
export const adminAiEquipmentSearchResponseSchema = z.object({
  candidates: z.array(adminAiEquipmentCandidateSchema),
  prompt: z.string(),
});

/** POST `/api/admin/equipment/:id/search-specs` — optional body. */
export const adminEquipmentSpecsSuggestRequestSchema = z.object({
  context: z.string().optional(),
});

/** Validated AI JSON for single-row specs suggestion. */
export const adminAiEquipmentSpecsWrapperSchema = z.object({
  specs: equipmentSpecsSchema,
});

const adminAiPurchaseLinkCandidateSchema = z.object({
  marketplace: z.string().min(1),
  baseUrl: z.string().min(1),
  affiliateProgram: z.string().nullable().optional(),
  priceUsd: z.number().nonnegative().nullable().optional(),
  region: z.string().optional(),
  isCanonical: z.boolean().optional(),
});

/** Validated wrapper from `POST /api/admin/equipment/:id/search-links`. */
export const adminAiPurchaseLinksWrapperSchema = z.object({
  links: z.array(adminAiPurchaseLinkCandidateSchema),
});
