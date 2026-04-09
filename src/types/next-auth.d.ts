import { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role?: "member" | "admin" | "super-admin";
    entitlements?: string[];
    subType?: "free" | "pro";
  }

  interface Session {
    user: {
      id: string;
      role?: "member" | "admin" | "super-admin";
      entitlements?: string[];
      subType?: "free" | "pro";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "member" | "admin" | "super-admin";
    entitlements?: string[];
    subType?: "free" | "pro";
    /** Unix ms — last successful Stripe → DB sync for this token (JWT callback throttle). */
    stripeBillingLastSync?: number;
  }
}
