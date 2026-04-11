import type { EquipmentType } from "@/shared/equipment/schema";
import { ADMIN_EQUIPMENT_TYPE_OPTIONS } from "@/shared/equipment/schema";

export interface EquipmentSearchPromptExistingItem {
  name: string;
  brand: string | null;
}

export interface BuildEquipmentSearchPromptInput {
  type: EquipmentType;
  count: number;
  brand?: string;
  context?: string;
  existingItems: EquipmentSearchPromptExistingItem[];
}

function labelForType(type: EquipmentType): string {
  const found = ADMIN_EQUIPMENT_TYPE_OPTIONS.find((o) => o.value === type);
  return found?.label ?? type;
}

/**
 * Field names and themes match `specsByType` in `@/shared/equipment/schema` so AI output aligns with admin forms.
 */
export function getEquipmentSpecGuidanceForType(type: EquipmentType): string {
  const blocks: Record<EquipmentType, string> = {
    grinder: `Use snake_case keys. Prefer real numbers/enums where known.
- Burr: type (flat_burr | conical_burr | blade), burr_size_mm, burr_material (steel | ceramic | titanium_coated), stepless (boolean), adjustment_mechanism, retention_g, grind_speed_g_per_sec
- Motor (electric): motor_rpm, motor_wattage, motor_type (AC | DC | brushless_DC); omit motor fields for hand grinders
- General: form_factor (hand | electric_countertop | commercial), intended_use (espresso | filter | omni), single_dose_friendly, hopper_capacity_g, weight_kg, dimensions, wattage, voltage (110V | 220V | dual), notes
Fill as many relevant fields as you can verify or reasonably infer; omit only what is truly unknown.`,

    machine: `Use snake_case keys. Prefer real numbers/booleans/enums where known.
- Thermal: type (single_boiler | thermocoil | thermoblock | heat_exchanger | dual_boiler | lever), boiler_material, boiler_size_ml, brew_boiler_size_ml, steam_boiler_size_ml, pid_controlled, heating_time_minutes
- Pump & pressure: pump_type (vibratory | rotary), max_pressure_bar, pressure_profiling, flow_control
- Features: pre_infusion, pre_infusion_type, shot_timer, programmable_volumes, steam_wand_type, hot_water_spout
- Water: water_reservoir_ml, plumb_in, portafilter_size_mm
- Shared: form_factor (home | prosumer | commercial), intended_use, weight_kg, dimensions, wattage, voltage, notes
Fill as many relevant fields as you can verify or reasonably infer; omit only what is truly unknown.`,

    tool: `Use snake_case keys: material, compatible_portafilter_mm, diameter_mm, and notes in description if needed. Add any other measurable attributes that fit the tool.`,

    kettle: `Use snake_case keys.
- Core: gooseneck (boolean), temp_control (none | preset | variable), hold_temp_capable (boolean), capacity_ml
- Shared: form_factor, intended_use, weight_kg, dimensions, wattage, voltage, notes`,

    scale: `Use snake_case keys.
- Core: response_time_ms, max_weight_g, precision_g, bluetooth, app_integration, auto_tare, timer_builtin
- Shared: form_factor, intended_use, weight_kg, dimensions, wattage, voltage, notes`,

    pour_over: `Use snake_case keys.
- Core: material (ceramic | glass | plastic | metal), flow_rate (slow | medium | fast), filter_type (paper | metal | cloth), capacity_ml
- Shared: form_factor, intended_use, weight_kg, dimensions, notes`,

    french_press: `Use snake_case keys.
- Core: capacity_ml, material (glass | stainless | plastic), mesh_gauge
- Shared: form_factor, intended_use, weight_kg, dimensions, notes`,

    moka_pot: `Use snake_case keys.
- Core: capacity_cups, material (aluminum | stainless), induction_compatible (boolean)
- Shared: form_factor, intended_use, weight_kg, dimensions, notes`,

    cold_brew: `Use snake_case keys.
- Core: method (immersion | drip_tower), capacity_ml, steep_time_min_hours, steep_time_max_hours
- Shared: form_factor, intended_use, weight_kg, dimensions, notes`,
  };

  return blocks[type];
}

/**
 * User message sent to the model for batch equipment discovery. Shared by the admin modal (preview)
 * and `POST /api/admin/equipment/search`.
 */
export function buildEquipmentSearchUserPrompt(input: BuildEquipmentSearchPromptInput): string {
  const typeLabel = labelForType(input.type);
  const lines: string[] = [
    `Suggest exactly ${input.count} distinct specialty coffee ${typeLabel} products (${input.type}) that are real, commercially available models.`,
    `Every item must use "type": "${input.type}" in the output.`,
  ];

  if (input.brand?.trim()) {
    lines.push(`Only include products from brand: ${input.brand.trim()}.`);
  }

  if (input.context?.trim()) {
    lines.push(`Additional criteria: ${input.context.trim()}`);
  }

  if (input.existingItems.length > 0) {
    lines.push("");
    lines.push("Do NOT suggest any of the following — they already exist in our catalog (match by name/brand loosely; prefer novel models):");
    for (const item of input.existingItems) {
      const brandPart = item.brand?.trim() ? item.brand.trim() : "(no brand)";
      lines.push(`- ${item.name.trim()} — ${brandPart}`);
    }
  }

  lines.push("");
  lines.push("Specs (required to be useful):");
  lines.push(
    'Each item must include a non-empty "specs" object with as many accurate, category-appropriate fields as you can justify. Use the canonical field names below; use numbers for measurements, booleans for yes/no, and string enums exactly as listed.',
  );
  lines.push(getEquipmentSpecGuidanceForType(input.type));
  lines.push("");
  lines.push(
    "Reply with ONLY valid JSON (no markdown fences, no commentary): a single array of objects, each with shape:",
  );
  lines.push(
    '{"name":"string","brand":"string or null","type":"' +
      input.type +
      '","description":"string or null","specs":{...}}',
  );
  lines.push(
    '"description" should briefly summarize the product (1–3 sentences). Use null for unknown brand only when unsure. Do not leave "specs" as {} unless no technical facts are known.',
  );

  return lines.join("\n");
}

/**
 * System prompt instructing the model to return a JSON array of equipment objects.
 */
export const EQUIPMENT_SEARCH_BATCH_SYSTEM = `You are a specialty coffee equipment expert. The user asks for multiple product suggestions. Reply with ONLY valid JSON (no markdown fences, no commentary): a JSON array of objects.

Each object must have: "name" (string), "brand" (string or null), "type" (string, must match the requested type exactly), "description" (string or null), "specs" (object).

Rules:
- Output must be a JSON array, length exactly as requested.
- "type" must be exactly the requested equipment type for every item.
- "specs" MUST be populated with real technical detail for each product: use the field names and value types described in the user message (snake_case keys matching our catalog). Include measurements (numbers), enums (exact strings given), and booleans where applicable. Prefer many well-chosen fields over an empty object.
- Only omit individual spec keys when unknown; avoid returning {} unless you truly cannot infer any attribute.
- "description" should be a short factual summary (not a repeat of specs).
- Use null for unknown brand only when unsure.
- Do not duplicate models; each array entry must be a distinct product.`;

export interface BuildEquipmentSpecsSuggestUserPromptInput {
  type: EquipmentType;
  name: string;
  brand: string | null;
  description: string | null;
  currentSpecs: Record<string, unknown> | null;
  extraContext?: string;
}

/**
 * User message for `POST /api/admin/equipment/:id/search-specs` — suggest specs for one catalog row.
 */
export function buildEquipmentSpecsSuggestUserPrompt(
  input: BuildEquipmentSpecsSuggestUserPromptInput,
): string {
  const safeSpecs =
    input.currentSpecs &&
    typeof input.currentSpecs === "object" &&
    !Array.isArray(input.currentSpecs)
      ? input.currentSpecs
      : {};
  const lines: string[] = [
    `Product: ${input.name}`,
    input.brand?.trim() ? `Brand: ${input.brand.trim()}` : "Brand: (unknown)",
    `Equipment type: ${input.type}`,
  ];
  if (input.description?.trim()) {
    lines.push(`Description: ${input.description.trim()}`);
  }
  lines.push(
    "",
    "Current specs in our database (JSON). Improve and expand where possible; preserve values that are already correct:",
    JSON.stringify(safeSpecs, null, 2),
    "",
    "Guidance for spec keys and enums:",
    getEquipmentSpecGuidanceForType(input.type),
  );
  if (input.extraContext?.trim()) {
    lines.push("", `Additional instructions: ${input.extraContext.trim()}`);
  }
  lines.push(
    "",
    'Reply with ONLY valid JSON (no markdown fences, no commentary) using this exact shape: {"specs":{...}}',
    'The "specs" object must use snake_case keys from the guidance. Omit keys you cannot confidently fill.',
  );
  return lines.join("\n");
}

/** System prompt for single-product specs suggestion on the admin equipment detail page. */
export const EQUIPMENT_SPECS_SUGGEST_SYSTEM = `You are a specialty coffee equipment expert. The user provides one catalog product and asks you to fill technical specifications. Reply with ONLY valid JSON (no markdown fences, no commentary) using this exact shape:
{"specs":{...}}

Rules:
- "specs" is one object: plausible technical attributes for this category (numbers for measurements, strings for enums, booleans as true/false).
- Use snake_case keys as described in the user message.
- Prefer accurate facts; omit uncertain fields rather than inventing them.
- When current specs are provided, merge intelligently: keep correct values, correct obvious errors, and add missing fields you are confident about.`;
