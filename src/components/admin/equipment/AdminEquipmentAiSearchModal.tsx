"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { ApiRoutes } from "@/app/routes";
import {
  ADMIN_EQUIPMENT_TYPE_OPTIONS,
  adminAiEquipmentCandidateSchema,
  type EquipmentType,
} from "@/shared/equipment/schema";
import type { z } from "zod";
import { buildEquipmentSearchUserPrompt } from "@/lib/ai-suggestions/equipment-search-prompt";
import { normalizeSpecsForPayload } from "@/components/admin/equipment/EquipmentSpecsEditor";
import { messageFromApiErrorBody } from "@/lib/api-error-message";

type AiCandidate = z.infer<typeof adminAiEquipmentCandidateSchema>;

interface AdminEquipmentAiSearchModalProps {
  open: boolean;
  onClose: () => void;
  listEndpoint: string;
}

function toSlug(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

async function fetchEquipmentForType(type: EquipmentType) {
  const url = new URL(ApiRoutes.admin.equipment.path, window.location.origin);
  url.searchParams.set("limit", "500");
  url.searchParams.set("offset", "0");
  url.searchParams.set("type", type);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error("Failed to load catalog");
  }
  return res.json() as Promise<{ data: { name: string; brand: string | null }[] }>;
}

export function AdminEquipmentAiSearchModal({ open, onClose, listEndpoint }: AdminEquipmentAiSearchModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"configure" | "results">("configure");
  const [searchLoading, setSearchLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [type, setType] = useState<EquipmentType>("grinder");
  const [count, setCount] = useState(5);
  const [brand, setBrand] = useState("");
  const [context, setContext] = useState("");

  const [candidates, setCandidates] = useState<AiCandidate[]>([]);
  const [promptUsed, setPromptUsed] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedSpecs, setExpandedSpecs] = useState<Set<number>>(new Set());

  const existingQuery = useQuery({
    queryKey: ["admin-equipment-ai-ignore", ApiRoutes.admin.equipment.path, type],
    queryFn: () => fetchEquipmentForType(type),
    enabled: open,
  });

  const previewPrompt = useMemo(() => {
    const existingItems =
      existingQuery.data?.data.map((r) => ({
        name: r.name,
        brand: r.brand,
      })) ?? [];
    return buildEquipmentSearchUserPrompt({
      type,
      count,
      brand: brand.trim() ? brand : undefined,
      context: context.trim() ? context : undefined,
      existingItems,
    });
  }, [type, count, brand, context, existingQuery.data]);

  function reset() {
    setStep("configure");
    setFormError(null);
    setType("grinder");
    setCount(5);
    setBrand("");
    setContext("");
    setCandidates([]);
    setPromptUsed("");
    setSelected(new Set());
    setExpandedSpecs(new Set());
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleSelected(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(candidates.map((_, i) => i)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  function toggleExpanded(index: number) {
    setExpandedSpecs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const n = Math.min(20, Math.max(1, Math.floor(Number(count)) || 5));
    setCount(n);
    setSearchLoading(true);
    setFormError(null);
    try {
      const res = await fetch(ApiRoutes.admin.equipment.search.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          count: n,
          brand: brand.trim() ? brand.trim() : undefined,
          context: context.trim() ? context.trim() : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        candidates?: AiCandidate[];
        prompt?: string;
      };
      if (!res.ok) {
        setFormError(messageFromApiErrorBody(data));
        return;
      }
      const list = data.candidates ?? [];
      if (list.length === 0) {
        setFormError("No candidates returned");
        return;
      }
      setCandidates(list);
      setPromptUsed(typeof data.prompt === "string" ? data.prompt : previewPrompt);
      setSelected(new Set(list.map((_, i) => i)));
      setStep("results");
    } catch {
      setFormError("Network error");
    } finally {
      setSearchLoading(false);
    }
  }

  async function saveSelected(e: React.FormEvent) {
    e.preventDefault();
    const indices = [...selected].sort((a, b) => a - b);
    if (indices.length === 0) {
      setFormError("Select at least one item to save");
      return;
    }

    setSaveLoading(true);
    setFormError(null);
    const errors: string[] = [];
    try {
      for (const i of indices) {
        const c = candidates[i];
        if (!c) continue;
        const specsPayload = normalizeSpecsForPayload(
          c.specs && typeof c.specs === "object" && !Array.isArray(c.specs) ? c.specs : {},
        );
        const body: Record<string, unknown> = {
          type: c.type,
          name: c.name.trim(),
          brand: c.brand?.trim() ? c.brand.trim() : null,
          slug: c.type === "tool" ? toSlug(c.name) : null,
          description: c.description?.trim() ? c.description.trim() : null,
          specs: specsPayload,
          isGlobal: true,
          adminApproved: true,
        };
        const res = await fetch(ApiRoutes.admin.equipment.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          errors.push(`${c.name}: ${messageFromApiErrorBody(err)}`);
        }
      }
      if (errors.length > 0) {
        setFormError(errors.join("\n"));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: [listEndpoint] });
      handleClose();
    } catch {
      setFormError("Network error");
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Search equipment (AI)">
      {step === "configure" && (
        <form onSubmit={runSearch} className="space-y-3">
          {formError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400 whitespace-pre-wrap">
              {formError}
            </p>
          )}
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Pick a type, how many models to suggest, and optional brand. The prompt includes existing catalog
            items to skip. Review results before saving.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Equipment type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EquipmentType)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              >
                {ADMIN_EQUIPMENT_TYPE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Number of items
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
              Brand (optional)
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Baratza"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
              Additional context (optional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              placeholder="e.g. entry-level electric, 64mm flat burrs"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Generated prompt</label>
              {existingQuery.isFetching && (
                <span className="text-xs text-stone-500">Loading catalog…</span>
              )}
              {existingQuery.isError && (
                <span className="text-xs text-amber-600">Could not load catalog for ignore list</span>
              )}
            </div>
            <textarea
              readOnly
              value={previewPrompt}
              rows={12}
              className="w-full resize-y rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-800 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={searchLoading}>
              {searchLoading ? "…" : "Search"}
            </Button>
          </div>
        </form>
      )}

      {step === "results" && (
        <form onSubmit={saveSelected} className="space-y-3">
          {formError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400 whitespace-pre-wrap">
              {formError}
            </p>
          )}

          <details className="rounded-lg border border-stone-200 dark:border-stone-700">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-stone-700 dark:text-stone-300">
              Prompt used
            </summary>
            <textarea
              readOnly
              value={promptUsed}
              rows={8}
              className="w-full resize-y border-t border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            />
          </details>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-600 dark:text-stone-400">
              {selected.size} of {candidates.length} selected
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={selectAll}>
              Select all
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={deselectAll}>
              Deselect all
            </Button>
          </div>

          <ul className="max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto rounded-lg border border-stone-200 p-2 dark:border-stone-700">
            {candidates.map((c, index) => (
              <li
                key={`${c.name}-${index}`}
                className="rounded-md border border-stone-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-900/50"
              >
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(index)}
                    onChange={() => toggleSelected(index)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-stone-900 dark:text-stone-100">{c.name}</div>
                    <div className="text-sm text-stone-600 dark:text-stone-400">
                      {c.brand ?? "—"} · {c.type.replace(/_/g, " ")}
                    </div>
                    {c.description && (
                      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400 line-clamp-3">
                        {c.description}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(index)}
                      className="mt-2 text-xs text-stone-500 underline hover:text-stone-700 dark:hover:text-stone-300"
                    >
                      {expandedSpecs.has(index) ? "Hide specs" : "Show specs"}
                    </button>
                    {expandedSpecs.has(index) && (
                      <pre className="mt-2 max-h-40 overflow-auto rounded bg-stone-100 p-2 text-xs dark:bg-stone-950">
                        {JSON.stringify(c.specs ?? {}, null, 2)}
                      </pre>
                    )}
                  </div>
                </label>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep("configure")}>
              Back
            </Button>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveLoading || selected.size === 0}>
              {saveLoading ? "…" : `Save ${selected.size} to catalog`}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
