import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../memory-refresh.ts"), "utf8");

describe("memory-refresh (quota safety)", () => {
  it("does not import the chats table — background refresh must not touch metered rows", () => {
    const importLine = source.match(
      /import\s*\{[^}]+\}\s*from\s*["']@\/db\/schema["']/,
    );
    expect(importLine?.[0]).toBeDefined();
    expect(importLine?.[0]).not.toMatch(/\bchats\b/);
    expect(importLine?.[0]).not.toMatch(/\bchatMessages\b/);
    expect(importLine?.[0]).not.toMatch(/\bchat_messages\b/);
  });
});
