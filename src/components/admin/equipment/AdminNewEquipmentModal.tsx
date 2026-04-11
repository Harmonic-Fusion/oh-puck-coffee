"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { ApiRoutes } from "@/app/routes";
import { ADMIN_EQUIPMENT_TYPE_OPTIONS, type EquipmentType } from "@/shared/equipment/schema";
import {
  EquipmentSpecsEditor,
  normalizeSpecsForPayload,
  type EquipmentSpecsEditorHandle,
} from "@/components/admin/equipment/EquipmentSpecsEditor";
import { messageFromApiErrorBody } from "@/lib/api-error-message";

interface AdminNewEquipmentModalProps {
  open: boolean;
  onClose: () => void;
  listEndpoint: string;
}

function toSlug(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function AdminNewEquipmentModal({ open, onClose, listEndpoint }: AdminNewEquipmentModalProps) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<EquipmentType>("grinder");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [specs, setSpecs] = useState<Record<string, unknown>>({});
  const specsEditorRef = useRef<EquipmentSpecsEditorHandle>(null);
  const [isGlobal, setIsGlobal] = useState(true);
  const [adminApproved, setAdminApproved] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function reset() {
    setType("grinder");
    setName("");
    setBrand("");
    setSlug("");
    setDescription("");
    setSpecs({});
    setIsGlobal(true);
    setAdminApproved(true);
    setErrors({});
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleNameChange(value: string) {
    setName(value);
    if (type === "tool") setSlug(toSlug(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Name is required";
    const syncResult = specsEditorRef.current?.syncJsonModeToValue();
    if (syncResult === null) {
      nextErrors.specs = "Fix specs JSON or switch to Form";
    }
    const specsSource =
      syncResult === undefined ? specs : syncResult === null ? {} : syncResult;
    const specsPayload =
      syncResult === null ? null : normalizeSpecsForPayload(specsSource);
    if (type === "tool") {
      if (!slug.trim()) nextErrors.slug = "Slug is required for tools";
      else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        nextErrors.slug = "Lowercase letters, numbers, hyphens only";
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(ApiRoutes.admin.equipment.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: name.trim(),
          brand: brand.trim() ? brand.trim() : null,
          slug: type === "tool" ? slug.trim() : null,
          description: description.trim() ? description.trim() : null,
          specs: specsPayload,
          isGlobal,
          adminApproved,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors({ _form: messageFromApiErrorBody(data) });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: [listEndpoint] });
      handleClose();
    } catch {
      setErrors({ _form: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="New equipment">
      <form onSubmit={handleSubmit} className="space-y-3">
        {errors._form && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {errors._form}
          </p>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Type</label>
          <select
            value={type}
            onChange={(e) => {
              const t = e.target.value as EquipmentType;
              setType(t);
              setSpecs({});
              if (t === "tool") setSlug(toSlug(name));
            }}
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
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Brand</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
        {type === "tool" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
            {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug}</p>}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
        <EquipmentSpecsEditor
          key={type}
          ref={specsEditorRef}
          type={type}
          value={specs}
          onChange={setSpecs}
          error={errors.specs}
        />
        <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
          <input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} />
          Global catalog
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
          <input type="checkbox" checked={adminApproved} onChange={(e) => setAdminApproved(e.target.checked)} />
          Admin approved
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "…" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
