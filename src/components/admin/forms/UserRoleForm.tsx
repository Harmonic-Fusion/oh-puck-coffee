"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";

type Role = "member" | "admin" | "super-admin";

interface UserRoleFormProps {
  open: boolean;
  onClose: () => void;
  user: { id: string; name: string | null; email: string | null; role: string };
}

const ROLES: Role[] = ["member", "admin", "super-admin"];

export function UserRoleForm({ open, onClose, user }: UserRoleFormProps) {
  const [role, setRole] = useState<Role>(user.role as Role);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Request failed");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setRole(user.role as Role);
    setError("");
    onClose();
  }

  const displayName = user.name || user.email || user.id;

  return (
    <Modal open={open} onClose={handleClose} title="Edit User Role">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Editing role for <span className="font-medium text-stone-900 dark:text-stone-100">{displayName}</span>
        </p>
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Role</label>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 px-3 py-2 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800">
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-stone-700 dark:text-stone-300">{r}</span>
              </label>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
