"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Refetches the session from the server when the user becomes authenticated
 * (e.g. after login redirect or on app load). Ensures the client has the latest
 * JWT-derived session (role, entitlements, subType) from the database.
 */
export function SessionRefetchOnAuth() {
  const { status, update } = useSession();
  const didRefetch = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      didRefetch.current = false;
      return;
    }
    if (status !== "authenticated") return;
    if (didRefetch.current) return;
    didRefetch.current = true;
    update();
  }, [status, update]);

  return null;
}
