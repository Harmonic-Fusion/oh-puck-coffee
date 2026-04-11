"use client";

import { useEffect, useRef, useState } from "react";
import {
  EquipmentSpecsEditor,
  normalizeSpecsForPayload,
  type EquipmentSpecsEditorHandle,
} from "@/components/admin/equipment/EquipmentSpecsEditor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRoutes, AppRoutes, resolvePath } from "@/app/routes";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { Button } from "@/components/ui/button";
import { resizeImageFileToJpegBlob } from "@/lib/image-resize";
import { useUploadEquipmentImage } from "@/components/equipment/hooks";
import type { EquipmentType } from "@/shared/equipment/schema";

interface EquipmentDetailResponse {
  id: string;
  type: EquipmentType;
  name: string;
  brand: string | null;
  slug: string | null;
  description: string | null;
  specs: Record<string, unknown> | null;
  isGlobal: boolean;
  adminApproved: boolean;
  imageId: string | null;
  createdAt: string;
  imageUrl: string | null;
  stats: { shotsCount: number; userCollectionCount: number };
}

interface PurchaseLinkRow {
  id: string;
  marketplace: string;
  baseUrl: string;
  priceUsd: number | null;
  region: string;
  isCanonical: boolean;
  approvedByUserId: string | null;
  lastVerifiedAt: string | null;
  deactivatedAt: string | null;
}

interface AiLinkCandidate {
  marketplace: string;
  baseUrl: string;
  affiliateProgram: string | null;
  priceUsd: number | null;
  region: string;
  isCanonical: boolean;
}

interface AdminEquipmentDetailClientProps {
  equipmentId: string;
}

export function AdminEquipmentDetailClient({ equipmentId }: AdminEquipmentDetailClientProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadEquipmentImage();

  const detailQuery = useQuery({
    queryKey: ["admin-equipment-detail", equipmentId],
    queryFn: async () => {
      const url = resolvePath(ApiRoutes.admin.equipment.equipmentId, { id: equipmentId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load equipment");
      return res.json() as Promise<EquipmentDetailResponse>;
    },
  });

  const linksQuery = useQuery({
    queryKey: ["admin-equipment-links", equipmentId],
    queryFn: async () => {
      const url = resolvePath(ApiRoutes.admin.equipment.equipmentId.links, { id: equipmentId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load links");
      const data = (await res.json()) as { links: PurchaseLinkRow[] };
      return data.links;
    },
  });

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [specs, setSpecs] = useState<Record<string, unknown>>({});
  const specsEditorRef = useRef<EquipmentSpecsEditorHandle>(null);
  const [isGlobal, setIsGlobal] = useState(true);
  const [adminApproved, setAdminApproved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const detail = detailQuery.data;

  useEffect(() => {
    if (!detail) return;
    setName(detail.name);
    setBrand(detail.brand ?? "");
    setSlug(detail.slug ?? "");
    setDescription(detail.description ?? "");
    setSpecs(
      detail.specs && typeof detail.specs === "object" && !Array.isArray(detail.specs)
        ? (detail.specs as Record<string, unknown>)
        : {},
    );
    setIsGlobal(detail.isGlobal);
    setAdminApproved(detail.adminApproved);
    setAiSpecsHint("");
  }, [detail, equipmentId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
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
      if (detail?.type === "tool") {
        if (!slug.trim()) nextErrors.slug = "Slug is required for tools";
        else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
          nextErrors.slug = "Lowercase letters, numbers, hyphens only";
        }
      }
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        throw new Error("validation");
      }
      setFieldErrors({});
      const url = resolvePath(ApiRoutes.admin.equipment.equipmentId, { id: equipmentId });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() ? brand.trim() : null,
          slug: detail?.type === "tool" ? slug.trim() : null,
          description: description.trim() ? description.trim() : null,
          specs: specsPayload,
          isGlobal,
          adminApproved,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      }
      return res.json() as Promise<EquipmentDetailResponse>;
    },
    onSuccess: () => {
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-equipment-detail", equipmentId] });
      void queryClient.invalidateQueries({ queryKey: [ApiRoutes.admin.equipment.path] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message !== "validation") {
        setFormError(err.message);
      }
    },
  });

  async function onPickFile(file: File) {
    setFormError(null);
    try {
      const blob = await resizeImageFileToJpegBlob(file);
      const record = await uploadImage.mutateAsync(blob);
      const url = resolvePath(ApiRoutes.admin.equipment.equipmentId, { id: equipmentId });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: record.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(typeof data.error === "string" ? data.error : "Could not attach image");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-equipment-detail", equipmentId] });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function clearPhoto() {
    setFormError(null);
    const url = resolvePath(ApiRoutes.admin.equipment.equipmentId, { id: equipmentId });
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: null }),
    });
    if (!res.ok) {
      setFormError("Could not remove image");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-equipment-detail", equipmentId] });
  }

  const [aiSpecsLoading, setAiSpecsLoading] = useState(false);
  const [aiSpecsHint, setAiSpecsHint] = useState("");

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [aiLinksOpen, setAiLinksOpen] = useState(false);
  const [aiLinksLoading, setAiLinksLoading] = useState(false);
  const [aiCandidates, setAiCandidates] = useState<AiLinkCandidate[]>([]);
  const [selectedAi, setSelectedAi] = useState<Record<number, boolean>>({});

  const [newLink, setNewLink] = useState({
    marketplace: "",
    baseUrl: "",
    region: "US",
    priceUsd: "" as string | number,
    isCanonical: false,
  });

  async function addManualLink(e: React.FormEvent) {
    e.preventDefault();
    const url = resolvePath(ApiRoutes.admin.equipment.equipmentId.links, { id: equipmentId });
    const price =
      newLink.priceUsd === "" || newLink.priceUsd === null
        ? null
        : Number(newLink.priceUsd);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketplace: newLink.marketplace.trim(),
        baseUrl: newLink.baseUrl.trim(),
        region: newLink.region.trim() || "US",
        priceUsd: price != null && !Number.isNaN(price) ? price : null,
        isCanonical: newLink.isCanonical,
      }),
    });
    if (!res.ok) {
      setFormError("Could not add link");
      return;
    }
    setLinkModalOpen(false);
    setNewLink({ marketplace: "", baseUrl: "", region: "US", priceUsd: "", isCanonical: false });
    void queryClient.invalidateQueries({ queryKey: ["admin-equipment-links", equipmentId] });
    void queryClient.invalidateQueries({ queryKey: [ApiRoutes.admin.equipment.path] });
  }

  async function runAiSpecsSuggest() {
    setAiSpecsLoading(true);
    setFormError(null);
    try {
      const url = resolvePath(ApiRoutes.admin.equipment.equipmentId.searchSpecs, { id: equipmentId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: aiSpecsHint.trim() ? aiSpecsHint.trim() : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        specs?: Record<string, unknown>;
      };
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "AI specs suggestion failed");
        return;
      }
      const next = data.specs;
      if (!next || typeof next !== "object" || Array.isArray(next)) {
        setFormError("Invalid specs from AI");
        return;
      }
      setSpecs((prev) => ({ ...prev, ...next }));
    } catch {
      setFormError("Network error");
    } finally {
      setAiSpecsLoading(false);
    }
  }

  async function runAiLinkSearch() {
    setAiLinksLoading(true);
    setFormError(null);
    try {
      const url = resolvePath(ApiRoutes.admin.equipment.equipmentId.searchLinks, { id: equipmentId });
      const res = await fetch(url, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "AI search failed");
        return;
      }
      const links = (data.links ?? []) as AiLinkCandidate[];
      setAiCandidates(links);
      setSelectedAi(Object.fromEntries(links.map((_, i) => [i, true])));
      setAiLinksOpen(true);
    } catch {
      setFormError("Network error");
    } finally {
      setAiLinksLoading(false);
    }
  }

  async function saveSelectedAiLinks() {
    const toSave = aiCandidates.filter((_, i) => selectedAi[i]);
    const base = resolvePath(ApiRoutes.admin.equipment.equipmentId.links, { id: equipmentId });
    for (const link of toSave) {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplace: link.marketplace,
          baseUrl: link.baseUrl,
          affiliateProgram: link.affiliateProgram,
          region: link.region ?? "US",
          priceUsd: link.priceUsd ?? null,
          isCanonical: link.isCanonical ?? false,
        }),
      });
      if (!res.ok) {
        setFormError("Some links could not be saved");
        break;
      }
    }
    setAiLinksOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["admin-equipment-links", equipmentId] });
    void queryClient.invalidateQueries({ queryKey: [ApiRoutes.admin.equipment.path] });
  }

  async function patchLink(linkId: string, body: Record<string, unknown>) {
    const url = resolvePath(ApiRoutes.admin.equipment.links.linkId, { linkId });
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setFormError("Link update failed");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["admin-equipment-links", equipmentId] });
  }

  async function deleteLink(linkId: string) {
    if (!window.confirm("Delete this link permanently?")) return;
    const url = resolvePath(ApiRoutes.admin.equipment.links.linkId, { linkId });
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      setFormError("Delete failed");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["admin-equipment-links", equipmentId] });
    void queryClient.invalidateQueries({ queryKey: [ApiRoutes.admin.equipment.path] });
  }

  if (detailQuery.isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />;
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Failed to load equipment.
      </div>
    );
  }

  const listPath = AppRoutes.puckingAdmin.equipment.path;

  return (
    <div>
      <AdminBreadcrumb
        segments={[
          { label: "Equipment", href: listPath },
          { label: detail.name },
        ]}
      />

      {formError && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {formError}
        </p>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Edit</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <p className="text-xs text-stone-500">
              Type: <span className="font-medium capitalize text-stone-700 dark:text-stone-300">{detail.type}</span>
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
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
            {detail.type === "tool" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                />
                {fieldErrors.slug && <p className="mt-1 text-xs text-red-600">{fieldErrors.slug}</p>}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                    Specs (AI)
                  </label>
                  <input
                    type="text"
                    value={aiSpecsHint}
                    onChange={(e) => setAiSpecsHint(e.target.value)}
                    placeholder="Optional hints for the model (e.g. verify burr size from product page)"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={aiSpecsLoading}
                  onClick={() => void runAiSpecsSuggest()}
                >
                  {aiSpecsLoading ? "…" : "Suggest specs (AI)"}
                </Button>
              </div>
              <EquipmentSpecsEditor
                key={detail.type}
                ref={specsEditorRef}
                type={detail.type}
                value={specs}
                onChange={setSpecs}
                error={fieldErrors.specs}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
              <input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} />
              Global catalog
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
              <input type="checkbox" checked={adminApproved} onChange={(e) => setAdminApproved(e.target.checked)} />
              Admin approved
            </label>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Photo</h3>
            <p className="mt-1 text-xs text-stone-500">Optional product photo (tools may omit).</p>
            <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-lg bg-stone-200 dark:bg-stone-800">
              {detail.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- authenticated API URL
                <img src={detail.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-500">No photo</div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                ev.target.value = "";
                if (f) void onPickFile(f);
              }}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadImage.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {detail.imageUrl ? "Replace" : "Upload"}
              </Button>
              {detail.imageUrl && (
                <Button type="button" variant="outline" size="sm" onClick={() => void clearPhoto()}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Usage</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-stone-500">Shots</dt>
                <dd className="font-medium text-stone-800 dark:text-stone-200">{detail.stats.shotsCount}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-stone-500">User collections</dt>
                <dd className="font-medium text-stone-800 dark:text-stone-200">{detail.stats.userCollectionCount}</dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-stone-100 pt-2 dark:border-stone-800">
                <dt className="text-stone-500">ID</dt>
                <dd className="break-all font-mono text-xs text-stone-600 dark:text-stone-400">{detail.id}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Purchase links</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setLinkModalOpen(true)}>
              Add link
            </Button>
            <Button type="button" size="sm" onClick={() => void runAiLinkSearch()} disabled={aiLinksLoading}>
              {aiLinksLoading ? "…" : "Find links (AI)"}
            </Button>
          </div>
        </div>

        {linksQuery.isLoading && <p className="mt-4 text-sm text-stone-500">Loading links…</p>}
        {linksQuery.data && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                  <th className="p-2">Store</th>
                  <th className="p-2">URL</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">Region</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {linksQuery.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-stone-400">
                      No links yet
                    </td>
                  </tr>
                ) : (
                  linksQuery.data.map((link) => (
                    <tr key={link.id} className="border-b border-stone-100 dark:border-stone-800">
                      <td className="p-2 align-top">{link.marketplace}</td>
                      <td className="max-w-[220px] p-2 align-top">
                        <a
                          href={link.baseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-amber-700 underline dark:text-amber-400"
                        >
                          {link.baseUrl}
                        </a>
                      </td>
                      <td className="p-2 align-top">{link.priceUsd != null ? `$${link.priceUsd}` : "—"}</td>
                      <td className="p-2 align-top">{link.region}</td>
                      <td className="p-2 align-top text-xs">
                        {link.deactivatedAt ? (
                          <span className="text-stone-400">Inactive</span>
                        ) : (
                          <span className="text-green-700 dark:text-green-400">Active</span>
                        )}
                        {link.approvedByUserId ? (
                          <span className="ml-1 text-stone-500">· Approved</span>
                        ) : null}
                        {link.lastVerifiedAt ? (
                          <span className="block text-stone-400">
                            Verified {new Date(link.lastVerifiedAt).toLocaleDateString()}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2 align-top">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            className="text-left text-xs text-amber-700 hover:underline dark:text-amber-400"
                            onClick={() =>
                              void patchLink(link.id, {
                                approved: !link.approvedByUserId,
                              })
                            }
                          >
                            {link.approvedByUserId ? "Unapprove" : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="text-left text-xs text-amber-700 hover:underline dark:text-amber-400"
                            onClick={() =>
                              void patchLink(link.id, {
                                lastVerifiedAt: new Date().toISOString(),
                              })
                            }
                          >
                            Mark verified
                          </button>
                          <button
                            type="button"
                            className="text-left text-xs text-amber-700 hover:underline dark:text-amber-400"
                            onClick={() =>
                              void patchLink(link.id, {
                                deactivatedAt: link.deactivatedAt ? null : new Date().toISOString(),
                              })
                            }
                          >
                            {link.deactivatedAt ? "Reactivate" : "Deactivate"}
                          </button>
                          <button
                            type="button"
                            className="text-left text-xs text-red-600 hover:underline"
                            onClick={() => void deleteLink(link.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-stone-900">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Add purchase link</h3>
            <form onSubmit={addManualLink} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Marketplace</label>
                <input
                  required
                  value={newLink.marketplace}
                  onChange={(e) => setNewLink((s) => ({ ...s, marketplace: e.target.value }))}
                  className="w-full rounded border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Product URL</label>
                <input
                  required
                  type="url"
                  value={newLink.baseUrl}
                  onChange={(e) => setNewLink((s) => ({ ...s, baseUrl: e.target.value }))}
                  className="w-full rounded border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Region</label>
                  <input
                    value={newLink.region}
                    onChange={(e) => setNewLink((s) => ({ ...s, region: e.target.value }))}
                    className="w-full rounded border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newLink.priceUsd}
                    onChange={(e) => setNewLink((s) => ({ ...s, priceUsd: e.target.value }))}
                    className="w-full rounded border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newLink.isCanonical}
                  onChange={(e) => setNewLink((s) => ({ ...s, isCanonical: e.target.checked }))}
                />
                Manufacturer / canonical page
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setLinkModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {aiLinksOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-stone-900">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">AI-suggested links</h3>
            <p className="mt-1 text-sm text-stone-500">Select links to add to this equipment. Review URLs before saving.</p>
            <ul className="mt-4 space-y-3">
              {aiCandidates.map((link, i) => (
                <li key={i} className="rounded border border-stone-200 p-3 dark:border-stone-700">
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAi[i] ?? false}
                      onChange={(e) => setSelectedAi((s) => ({ ...s, [i]: e.target.checked }))}
                    />
                    <span>
                      <span className="font-medium">{link.marketplace}</span>
                      <a
                        href={link.baseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block break-all text-amber-700 underline dark:text-amber-400"
                      >
                        {link.baseUrl}
                      </a>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {aiCandidates.length === 0 && (
              <p className="mt-4 text-sm text-stone-500">No links returned. Try again or add manually.</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAiLinksOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void saveSelectedAiLinks()} disabled={aiCandidates.length === 0}>
                Add selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
