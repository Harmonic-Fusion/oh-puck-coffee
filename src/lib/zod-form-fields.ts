import { z } from "zod";

export type ZodFieldInputType = "text" | "number" | "checkbox" | "select";

export interface ZodFieldDescriptor {
  key: string;
  label: string;
  inputType: ZodFieldInputType;
  options?: { value: string; label: string }[];
}

function keyToLabel(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function unwrapLeaf(schema: z.ZodTypeAny): z.ZodTypeAny {
  let s: z.ZodTypeAny = schema;
  while (s instanceof z.ZodOptional || s instanceof z.ZodNullable) {
    s = s._def.innerType as z.ZodTypeAny;
  }
  return s;
}

/**
 * Introspects a `z.object()` schema and returns descriptors for simple leaf types:
 * enum → select, number, boolean, string (default).
 */
export function zodSchemaToFields(schema: z.ZodObject<z.ZodRawShape>): ZodFieldDescriptor[] {
  const shape = schema.shape;
  return Object.keys(shape).map((key) => {
    const inner = unwrapLeaf(shape[key]!);
    const label = keyToLabel(key);

    if (inner instanceof z.ZodEnum) {
      const values = inner.options as string[];
      return {
        key,
        label,
        inputType: "select",
        options: values.map((v) => ({
          value: v,
          label: keyToLabel(String(v).replace(/_/g, " ")),
        })),
      };
    }
    if (inner instanceof z.ZodNumber) {
      return { key, label, inputType: "number" };
    }
    if (inner instanceof z.ZodBoolean) {
      return { key, label, inputType: "checkbox" };
    }
    if (inner instanceof z.ZodString) {
      return { key, label, inputType: "text" };
    }
    return { key, label, inputType: "text" };
  });
}
