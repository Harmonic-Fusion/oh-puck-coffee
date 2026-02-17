"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "./Modal";
import { ApiRoutes } from "@/app/routes";
import { useToast } from "./Toast";

type FeedbackType = "bug" | "feature" | "other";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { showToast } = useToast();

  const submitFeedback = useMutation({
    mutationFn: async (data: { type: FeedbackType; subject: string; message: string }) => {
      const res = await fetch(ApiRoutes.feedback.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to submit feedback");
      }
      return res.json();
    },
    onSuccess: () => {
      showToast("success", "Thank you for your feedback!");
      setType("bug");
      setSubject("");
      setMessage("");
      onClose();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to submit feedback";
      showToast("error", message);
    },
  });

  function handleSubmit() {
    if (!subject.trim() || !message.trim()) {
      showToast("error", "Please fill in all fields");
      return;
    }
    submitFeedback.mutate({ type, subject: subject.trim(), message: message.trim() });
  }

  function handleClose() {
    if (!submitFeedback.isPending) {
      setType("bug");
      setSubject("");
      setMessage("");
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Send Feedback"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitFeedback.isPending}
            className="h-12 rounded-xl border-2 border-stone-300 px-6 text-base font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitFeedback.isPending || !subject.trim() || !message.trim()}
            className="h-12 rounded-xl border-2 border-amber-700 bg-amber-700 px-6 text-base font-medium text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
          >
            {submitFeedback.isPending ? "Submitting..." : "Submit"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Type
          </label>
          <div className="flex gap-3">
            {(["bug", "feature", "other"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                disabled={submitFeedback.isPending}
                className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  type === option
                    ? "border-amber-600 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-400"
                    : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
                } disabled:opacity-50`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="feedback-subject"
            className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Subject
          </label>
          <input
            id="feedback-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={submitFeedback.isPending}
            maxLength={200}
            placeholder="Brief description of your feedback"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:placeholder:text-stone-500"
          />
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {subject.length}/200 characters
          </p>
        </div>

        <div>
          <label
            htmlFor="feedback-message"
            className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Message
          </label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={submitFeedback.isPending}
            maxLength={5000}
            rows={6}
            placeholder="Please provide details about your feedback..."
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:placeholder:text-stone-500"
          />
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {message.length}/5000 characters
          </p>
        </div>
      </div>
    </Modal>
  );
}
