"use client";

import { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { specsByType, type EquipmentType } from "@/shared/equipment/schema";
import { zodSchemaToFields, type ZodFieldDescriptor } from "@/lib/zod-form-fields";

type SpecFieldMeta = {
  unit?: string;
  step?: number;
  showWhen?: { field: string; value: string | number | boolean };
};

const GRINDER_FIELD_META: Partial<Record<string, SpecFieldMeta>> = {
  burr_size_mm: { unit: "mm" },
  retention_g: { unit: "g", step: 0.1 },
  weight_kg: { unit: "kg", step: 0.1 },
  wattage: { unit: "W" },
  motor_wattage: { unit: "W" },
  grind_steps: { showWhen: { field: "stepless", value: false } },
};

const MACHINE_FIELD_META: Partial<Record<string, SpecFieldMeta>> = {
  portafilter_size_mm: { unit: "mm" },
  water_reservoir_ml: { unit: "ml" },
  brew_boiler_size_ml: { unit: "ml" },
  steam_boiler_size_ml: { unit: "ml" },
  boiler_size_ml: { unit: "ml" },
  weight_kg: { unit: "kg", step: 0.1 },
  wattage: { unit: "W" },
  max_pressure_bar: { unit: "bar", step: 0.1 },
  heating_time_minutes: { unit: "min", step: 0.1 },
  pre_infusion_type: { showWhen: { field: "pre_infusion", value: true } },
};

const TOOL_FIELD_META: Partial<Record<string, SpecFieldMeta>> = {
  compatible_portafilter_mm: { unit: "mm" },
  diameter_mm: { unit: "mm" },
};

const KETTLE_FIELD_META: Partial<Record<string, SpecFieldMeta>> = {
  capacity_ml: { unit: "ml" },
  weight_kg: { unit: "kg", step: 0.1 },
  wattage: { unit: "W" },
};

const SCALE_FIELD_META: Partial<Record<string, SpecFieldMeta>> = {
  response_time_ms: { unit: "ms" },
  max_weight_g: { unit: "g" },
  precision_g: { unit: "g", step: 0.01 },
  weight_kg: { unit: "kg", step: 0.1 },
  wattage: { unit: "W" },
};

const POUR_OVER_FIELD_META: Partial<Record<string, SpecFieldMeta>> = {
  capacity_ml: { unit: "ml" },
  weight_kg: { unit: "kg", step: 0.1 },
};

const FRENCH_PRESS_FIELD_META: Partial<Record<string, SpecFieldMeta>> = {
  capacity_ml: { unit: "ml" },
  weight_kg: { unit: "kg", step: 0.1 },
};

const MOKA_POT_FIELD_META: Partial<Record<string, SpecFieldMeta>> = {
  weight_kg: { unit: "kg", step: 0.1 },
};

const COLD_BREW_FIELD_META: Partial<Record<string, SpecFieldMeta>> = {
  capacity_ml: { unit: "ml" },
  steep_time_min_hours: { unit: "h", step: 0.5 },
  steep_time_max_hours: { unit: "h", step: 0.5 },
  weight_kg: { unit: "kg", step: 0.1 },
};

function metaForKey(type: EquipmentType, key: string): SpecFieldMeta | undefined {
  if (type === "grinder") return GRINDER_FIELD_META[key];
  if (type === "machine") return MACHINE_FIELD_META[key];
  if (type === "tool") return TOOL_FIELD_META[key];
  if (type === "kettle") return KETTLE_FIELD_META[key];
  if (type === "scale") return SCALE_FIELD_META[key];
  if (type === "pour_over") return POUR_OVER_FIELD_META[key];
  if (type === "french_press") return FRENCH_PRESS_FIELD_META[key];
  if (type === "moka_pot") return MOKA_POT_FIELD_META[key];
  if (type === "cold_brew") return COLD_BREW_FIELD_META[key];
  return undefined;
}

function fieldVisible(
  type: EquipmentType,
  field: ZodFieldDescriptor,
  values: Record<string, unknown>,
): boolean {
  const meta = metaForKey(type, field.key);
  const sw = meta?.showWhen;
  if (!sw) return true;
  return values[sw.field] === sw.value;
}

/** Drops empty optional values; returns `null` if nothing left (for API payloads). */
export function normalizeSpecsForPayload(specs: Record<string, unknown>): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(specs)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "number" && Number.isNaN(v)) continue;
    out[k] = v;
  }
  return Object.keys(out).length === 0 ? null : out;
}

export interface EquipmentSpecsEditorProps {
  type: EquipmentType;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  error?: string;
}

export type EquipmentSpecsEditorHandle = {
  /** Call before persisting. Returns parsed specs, or `null` if JSON mode contains invalid JSON. */
  syncJsonModeToValue: () => Record<string, unknown> | null;
};

export const EquipmentSpecsEditor = forwardRef<
  EquipmentSpecsEditorHandle,
  EquipmentSpecsEditorProps
>(function EquipmentSpecsEditor({ type, value, onChange, error }, ref) {
  const [mode, setMode] = useState<"form" | "json">("form");
  const [jsonText, setJsonText] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      syncJsonModeToValue() {
        if (mode === "form") return { ...value };
        try {
          const parsed = JSON.parse(jsonText) as unknown;
          if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
            setJsonError("Specs must be a JSON object");
            return null;
          }
          const rec = parsed as Record<string, unknown>;
          onChange(rec);
          setJsonError(null);
          return rec;
        } catch {
          setJsonError("Invalid JSON");
          return null;
        }
      },
    }),
    [mode, jsonText, onChange, value],
  );

  const fields = useMemo(
    () => zodSchemaToFields(specsByType[type] as Parameters<typeof zodSchemaToFields>[0]),
    [type],
  );

  function patchValue(key: string, next: unknown) {
    const copy = { ...value };
    if (next === undefined || next === "" || next === null) {
      delete copy[key];
    } else {
      copy[key] = next;
    }
    onChange(copy);
  }

  function trySwitchToForm() {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonError("Specs must be a JSON object");
        return;
      }
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
      setMode("form");
    } catch {
      setJsonError("Invalid JSON");
    }
  }

  function switchToJson() {
    setJsonError(null);
    try {
      setJsonText(JSON.stringify(value, null, 2));
    } catch {
      setJsonText("{}");
    }
    setMode("json");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Specs</span>
        <div className="inline-flex rounded-lg border border-stone-200 p-0.5 dark:border-stone-600">
          <button
            type="button"
            onClick={() => {
              if (mode === "json") trySwitchToForm();
              else setMode("form");
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              mode === "form"
                ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
            }`}
          >
            Form
          </button>
          <button
            type="button"
            onClick={() => {
              if (mode === "form") switchToJson();
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              mode === "json"
                ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
            }`}
          >
            JSON
          </button>
        </div>
      </div>

      {mode === "form" ? (
        <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/80 p-3 dark:border-stone-600 dark:bg-stone-900/40">
          {fields.map((field) => {
            if (!fieldVisible(type, field, value)) return null;
            const meta = metaForKey(type, field.key);
            const raw = value[field.key];

            if (field.inputType === "checkbox") {
              const checked = raw === true;
              return (
                <label key={field.key} className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => patchValue(field.key, e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-amber-700"
                  />
                  {field.label}
                </label>
              );
            }

            if (field.inputType === "select" && field.options) {
              return (
                <div key={field.key}>
                  <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                    {field.label}
                    {meta?.unit ? <span className="text-stone-400"> ({meta.unit})</span> : null}
                  </label>
                  <select
                    value={typeof raw === "string" ? raw : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      patchValue(field.key, v === "" ? undefined : v);
                    }}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    <option value="">—</option>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.inputType === "number") {
              const num =
                typeof raw === "number"
                  ? raw
                  : typeof raw === "string" && raw !== ""
                    ? Number(raw)
                    : "";
              return (
                <div key={field.key}>
                  <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                    {field.label}
                    {meta?.unit ? <span className="text-stone-400"> ({meta.unit})</span> : null}
                  </label>
                  <input
                    type="number"
                    value={num === "" || Number.isNaN(num as number) ? "" : num}
                    step={meta?.step ?? "any"}
                    onChange={(e) => {
                      const t = e.target.value;
                      if (t === "") {
                        patchValue(field.key, undefined);
                        return;
                      }
                      const n = Number(t);
                      if (!Number.isNaN(n)) patchValue(field.key, n);
                    }}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  />
                </div>
              );
            }

            return (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                  {field.label}
                  {meta?.unit ? <span className="text-stone-400"> ({meta.unit})</span> : null}
                </label>
                <input
                  type="text"
                  value={typeof raw === "string" ? raw : raw != null ? String(raw) : ""}
                  onChange={(e) => {
                    const t = e.target.value;
                    patchValue(field.key, t === "" ? undefined : t);
                  }}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonError(null);
            }}
            rows={8}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
          {jsonError && <p className="mt-1 text-xs text-red-600">{jsonError}</p>}
          <button
            type="button"
            onClick={trySwitchToForm}
            className="mt-2 text-xs font-medium text-amber-800 underline hover:text-amber-900 dark:text-amber-400"
          >
            Apply JSON and switch to Form
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

EquipmentSpecsEditor.displayName = "EquipmentSpecsEditor";
