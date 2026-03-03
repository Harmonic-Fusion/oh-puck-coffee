"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import type { AdminFeedback, FeedbackStatus } from "@/app/pucking-admin/feedback/page";
import { ApiRoutes, resolvePath } from "@/app/routes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const feedbackId = (ApiRoutes.admin as any).feedback.feedbackId as { path: string };

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  in_progress: "In Progress",
  complete: "Complete",
  wont_implement: "Won't Implement",
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "Feature",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  bug: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  feature: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  other: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

interface FeedbackEditFormProps {
  open: boolean;
  onClose: () => void;
  feedback: AdminFeedback;
}

export function FeedbackEditForm({ open, onClose, feedback }: FeedbackEditFormProps) {
  const [status, setStatus] = useState<FeedbackStatus>(feedback.status);
  const [priority, setPriority] = useState<string>(
    feedback.priority !== null ? String(feedback.priority) : ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = { status };
      body.priority = priority !== "" ? parseInt(priority, 10) : null;

      const res = await fetch(resolvePath(feedbackId, { id: feedback.id }), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Request failed");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStatus(feedback.status);
    setPriority(feedback.priority !== null ? String(feedback.priority) : "");
    setError("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Edit Feedback">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Read-only metadata */}
        <div className="space-y-2 rounded-lg bg-stone-50 p-3 dark:bg-stone-800/50">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[feedback.type] ?? TYPE_COLORS.other}`}
            >
              {TYPE_LABELS[feedback.type] ?? feedback.type}
            </span>
            <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
              {feedback.userEmail ?? "Unknown user"}
            </span>
          </div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
            {feedback.subject}
          </p>
          <div className="max-h-40 overflow-y-auto rounded border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900">
            <p className="whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">
              {feedback.message}
            </p>
          </div>
        </div>

        {/* Editable fields */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          >
            {(Object.keys(STATUS_LABELS) as FeedbackStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Priority (0–100)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder="None"
              className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
            {priority !== "" && (
              <button
                type="button"
                onClick={() => setPriority("")}
                className="shrink-0 rounded px-2 py-1.5 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={loading}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
