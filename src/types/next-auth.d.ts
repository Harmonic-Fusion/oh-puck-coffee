import { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role?: "member" | "admin" | "super-admin";
    entitlements?: string[];
  }

  interface Session {
    user: {
      id: string;
      role?: "member" | "admin" | "super-admin";
      entitlements?: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "member" | "admin" | "super-admin";
    entitlements?: string[];
  }
}
