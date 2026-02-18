import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role?: "member" | "admin";
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "member" | "admin";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "member" | "admin";
  }
}
