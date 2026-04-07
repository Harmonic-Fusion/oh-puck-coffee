# Problem Statement

Users pulling shots with a specific bean have no guided way to improve their next attempt. An AI-powered suggestion feature can analyze a user's shot history for a given bean and recommend parameter adjustments (grind, dose, yield, temperature, etc.) to dial in their espresso. Usage must be metered per subscription tier to align with the billing model.

Separately, the product needs **durable AI memory** stored as markdown: one stream summarizing **user-level preferences** and another summarizing **beans-level profile**. These memories can be produced and refreshed **in the background** (server-side jobs, not user-initiated chat). They are **independent** of the metered suggestion flow—calls that only read or update these memories **do not** increment the user’s weekly AI suggestion quota.

# Scope

- **Component**: A React component (`AiShotSuggestion`) that accepts a `beans_id`, fetches the user's shot history for that bean, sends the data to an AI chat endpoint, and displays the returned suggestion.
- **Database — metered conversations**: Two new tables to capture AI conversations:
  - **`chats`** — generic conversation container. Links to `users` (owner). Tracks the chat type/purpose and timestamps. Does **not** contain domain FKs — instead, domain tables point to chats (e.g. `beans_share.chat_id`). This keeps `chats` reusable for future AI features beyond shot suggestions.
  - **`chat_messages`** — individual messages within a chat. Each message has a `role` (`system | developer | user | assistant`), `content`, `model_identifier` (e.g. `gpt-4o`), `metadata` (jsonb for flexible storage like temperature, stop reason, etc.), `token_count` (integer), `index` (integer, explicit ordering within the chat — 0-based, monotonically increasing), and timestamps.
- **Association**: `beans_share.chat_id` (nullable FK → `chats.id`) links a specific user+bean pair to its **most recent** AI suggestion conversation. The `chats` table intentionally has **no** domain-specific FKs — domain tables point *to* chats, not the other way around. This keeps `chats` generic and reusable. To query **all** past chats for a user+bean pair, query `chats` by `user_id` + `type = 'shot_suggestion'` and join through `beans_share` on matching `user_id` + `bean_id` (or store `bean_id` in `chats.metadata`). The `beans_share.chat_id` FK is a convenience pointer to the latest conversation, not the sole relationship. Other domain tables can adopt the same `chat_id` pattern in the future.
- **Rate Limits** (configurable in `src/shared/entitlements.ts` via `AiSuggestionLimits`):
  - Free tier (no AI entitlement): **3 suggestions per week**
  - Single Shot plan (`ai-shot-suggestions` entitlement): **9 suggestions per week**
  - Double Shot plan (`ai-shot-suggestions-plus` entitlement): **27 suggestions per week**
  - Resolution order: check for `ai-shot-suggestions-plus` first (highest), then `ai-shot-suggestions`, then fall back to free. This follows the existing entitlement pattern — Stripe product entitlement features assign the appropriate key per product, no `stripeProductId` lookup needed at request time.
- **Rate-limit counting**: Count by number of `chats` rows (not messages) created by the user in the current week. Each suggestion request creates one chat with its system/user/assistant messages.
- **API Endpoints**:
  - `POST /api/chats` — create a new AI chat (creates a chat + messages, sends shot data to AI, returns suggestion).
  - `GET /api/chats/usage` — returns the user's current-week usage count and their weekly limit.
- **Entitlements**: Two entitlement keys for tiered access:
  - `AI_SHOT_SUGGESTIONS` (`ai-shot-suggestions`) — already exists in `EntitlementDefs`. Grants Single Shot tier (9/week).
  - `AI_SHOT_SUGGESTIONS_PLUS` (`ai-shot-suggestions-plus`) — **new**, to be added to `EntitlementDefs`. Grants Double Shot tier (27/week).
  - Free-tier users (neither entitlement) still get a baseline allowance (3/week).
- **AI Provider**: Use the Vercel AI SDK (`ai` + `@ai-sdk/openai`) for the chat call. Add `OPENAI_API_KEY` to `config.ts`.
- **Database — background memory (not metered)**:
  - **`ai_user_memory`** — one row per user (`user_id` → `users`). `content` is markdown. `model_identifier` records which model produced or last updated the summary. Used independently to capture **user preferences** (equipment habits, taste goals, dialing style, etc.).
  - **`ai_beans_memory`** — one row per bean (`bean_id` → `beans`). Same shape: markdown `content`, `model_identifier`. Captures a **bean profile** (origin notes, typical ranges, how this bean behaves in the app’s data) independent of any single user.
  - **Usage**: Background jobs (cron, queue workers, or internal scripts) may call the model to create or refresh these rows. Those operations **must not** count toward `AiSuggestionLimits` / weekly `chats` counts. The metered product surface remains **user-initiated** `POST /api/chats` only (or explicitly documented exceptions).
  - **Relationship to suggestions**: The suggestion pipeline **may** read these markdown fields to enrich prompts; that read does not consume quota. Writing memory via background jobs does not consume quota either.
- **Prompt templates** (`src/lib/ai-suggestions/prompts.ts` — **server-only**, not in `shared/`): Typed prompt builders with Zod schemas for template variables. Each template is a function that accepts a validated input object and returns a message array. Prompt text, system instructions, and template logic must never be exposed to the client — the frontend only interacts via `POST /api/chats` (sends `beanId`, receives suggestion text).
  - **`SuggestionPromptVars`** (Zod schema):
    - `beanName: z.string()` — bean name
    - `roastLevel: z.string()` — roast level
    - `originName: z.string().optional()` — origin country/region
    - `processingMethod: z.string().optional()` — processing method
    - `shotHistory: z.array(ShotSummarySchema)` — recent shots (most recent first, max ~15)
    - `referenceShot: ShotSummarySchema.optional()` — the user's marked reference shot for this bean, if any
    - `userMemory: z.string().optional()` — `ai_user_memory.content` markdown (injected when present)
    - `beanMemory: z.string().optional()` — `ai_beans_memory.content` markdown (injected when present)
  - **`ShotSummarySchema`** (Zod schema — subset of shot fields relevant to dialing in):
    - `doseGrams`, `yieldGrams`, `grindLevel`, `brewTempC`, `brewTimeSecs`, `yieldActualGrams` — recipe/result numerics
    - `brewPressure`, `preInfusionDuration`, `flowRate` — optional advanced params
    - `rating`, `shotQuality`, `bitter`, `sour` — subjective scores
    - `flavors: z.array(z.string()).optional()` — tasting notes
    - `notes: z.string().optional()` — free-form notes
    - `createdAt: z.coerce.date()` — shot timestamp
  - **System prompt outline**: "You are an espresso dialing-in coach. Given the user's shot history for {beanName} ({roastLevel}, {origin}), analyze trends in extraction (bitter/sour balance, flow rate, brew time) and suggest specific parameter adjustments for the next shot. Be concise and actionable. Reference the user's reference shot if available."
  - Template functions are pure and testable — they accept `SuggestionPromptVars` and return `CoreMessage[]` (from the Vercel AI SDK).
- **Out of scope**: Admin management UI for suggestions, streaming responses (v1 returns a complete response), suggestion history UI beyond the current request, multi-turn follow-up conversations (v1 is single-turn per chat, but the schema supports future multi-turn). A dedicated **user-facing** UI for editing raw memory is out of scope for v1 unless explicitly added later.

# Solution

Add a new `ai-suggestions` domain following the project's established patterns (schema, routes, API handler, component, hooks). Use a normalized `chats` + `chat_messages` two-table design instead of a flat request log.

**Why two tables instead of a flat `ai_suggestion_requests`:**
- Separating the conversation container (`chats`) from its messages (`chat_messages`) naturally supports future multi-turn conversations without schema changes.
- Rate limiting counts `chats` rows (one per suggestion request), not individual messages — clean and predictable.
- The `chat_messages.role` enum (`system | developer | user | assistant`) maps directly to the OpenAI/Vercel AI SDK message format, making it straightforward to reconstruct conversation context.
- `token_count` on each message enables cost tracking and per-user usage analytics.
- `metadata` (jsonb) on messages provides flexible storage for model parameters, stop reasons, or any provider-specific data without schema changes.

**Why domain objects point to chats (not the reverse):**
- `chats` stays generic — no domain-specific FKs cluttering it. Any table can add a nullable `chat_id` column to link to a conversation.
- `beans_share.chat_id` connects a user+bean relationship to its AI conversation. Different users sharing the same bean get independent conversations — the right granularity for personalized suggestions based on each user's own shot history.
- Querying "show the AI conversation for this user's bean" is a simple join through `beans_share`.
- Future features (e.g. AI recipe analysis, grinder calibration suggestions) can reuse `chats` + `chat_messages` by adding `chat_id` to their respective tables — no schema changes to the chat tables themselves.

**Why separate `ai_user_memory` / `ai_beans_memory` from `chats` / `chat_messages`:**
- Metering and product semantics are tied to **user-initiated suggestion chats** (`chats` rows of type `shot_suggestion`). Memory is **long-lived markdown**, updated on its own cadence, not a message thread.
- Keeping memory in dedicated tables avoids mixing “conversation logs” with “rolling summaries” and keeps rate-limit logic simple: count only relevant `chats` rows for suggestions.
- `model_identifier` on each memory row supports auditing and safe refreshes when models change.

**Failure handling / quota atomicity**: The `POST /api/chats` endpoint must not consume quota on AI call failure. Approach: create the `chats` row and user/system `chat_messages` rows, attempt the AI call, and persist the assistant message on success. If the AI call fails (timeout, provider error, rate limit), delete the `chats` row (cascade deletes its messages) so the user's weekly count is not incremented. Return a clear error to the client so it can show a retry prompt.

**Other design decisions:**
- Configuring limits alongside `EntitlementDefs` in `src/shared/entitlements.ts` keeps billing/feature-gating logic centralized and importable by both client (to show remaining count) and server (to enforce limits).
- Using the Vercel AI SDK aligns with the Next.js ecosystem and provides a clean abstraction over OpenAI with minimal boilerplate.
- The `GET /api/chats/usage` endpoint lets the UI show "X of Y suggestions used this week" before the user clicks, reducing frustration from hitting limits.
- The "week" window resets on Monday 00:00 UTC for predictable, user-friendly resets.

**Tier detection**: The API determines the user's suggestion limit purely from JWT entitlements — no extra DB query needed. `getAiSuggestionLimit(session)` checks `session.user.entitlements` for `ai-shot-suggestions-plus` (→ 27/week), then `ai-shot-suggestions` (→ 9/week), falling back to 3/week. The `AiSuggestionLimits` map in `entitlements.ts` centralizes these values, importable by both client and server.

**Table definitions:**

```
chats
├── id              text PK (nanoid, prefix "chat_" — via createChatId())
├── user_id         text FK → users.id (cascade delete)
├── type            text ("shot_suggestion") — extensible for future chat types
├── title           text (nullable, auto-generated summary)
├── created_at      timestamp
└── updated_at      timestamp

chat_messages
├── id              text PK (nanoid, prefix "cmsg_" — via createChatMessageId())
├── chat_id         text FK → chats.id (cascade delete)
├── index           integer NOT NULL — explicit 0-based ordering within the chat
├── role            text ("system" | "developer" | "user" | "assistant")
├── content         text
├── model_identifier text (nullable — null for user/system messages, e.g. "gpt-4o" for assistant)
├── token_count     integer (nullable)
├── metadata        jsonb (nullable — temperature, stop_reason, etc.)
└── created_at      timestamp

beans_share (existing table, modified)
└── chat_id         text FK → chats.id (nullable, on delete set null) — points to the most recent AI suggestion chat for this user+bean pair. FK declared with `.references(() => chats.id, { onDelete: "set null" })` in schema.ts. Note: `chats` must be defined before `beansShare` in schema.ts so the reference resolves.

ai_user_memory
├── id                text PK (nanoid, prefix "aum_" — via createAiUserMemoryId())
├── user_id           text FK → users.id (cascade delete)
├── content           text (markdown)
├── model_identifier  text (nullable — model that wrote/updated this summary)
├── created_at        timestamp
└── updated_at        timestamp
(unique on user_id if at most one current row per user)

ai_beans_memory
├── id                text PK (nanoid, prefix "abm_" — via createAiBeansMemoryId())
├── bean_id           text FK → beans.id (cascade delete)
├── content           text (markdown)
├── model_identifier  text (nullable)
├── created_at        timestamp
└── updated_at        timestamp
(unique on bean_id if at most one current row per bean)
```

All new IDs use prefixed nanoids via `src/lib/nanoid-ids.ts` (add `createChatId`, `createChatMessageId`, `createAiUserMemoryId`, `createAiBeansMemoryId`).

# Plan summary

Implement metered shot-suggestion chats (`chats` + `chat_messages` + `beans_share.chat_id`), entitlement-based weekly limits, Vercel AI SDK integration, and the `AiShotSuggestion` UI. Add **`ai_user_memory`** and **`ai_beans_memory`** as markdown stores for background-maintained summaries; **do not** count memory refresh jobs toward suggestion quota. Optionally inject memory into suggestion prompts when present. Ship idempotent migrations and centralized routes/config per project conventions.

# Tasks

## Phase 1: Configuration & schema

- [x] Add `AI_SHOT_SUGGESTIONS_PLUS` to `EntitlementDefs`, add `AiSuggestionLimits` map + `getAiSuggestionLimit()` helper to `src/shared/entitlements.ts`
- [x] Add `OPENAI_API_KEY` to `src/shared/config.ts` and `ApiRoutes.ai.chats` / `ApiRoutes.ai.chatsUsage` in `src/app/routes.ts`
- [x] Add `createChatId`, `createChatMessageId`, `createAiUserMemoryId`, `createAiBeansMemoryId` to `src/lib/nanoid-ids.ts`
- [x] Extend `src/db/schema.ts` with `chats`, `chat_messages` (with explicit `index` column for ordering), `ai_user_memory`, and `ai_beans_memory`; add `.references(() => chats.id, { onDelete: "set null" })` to `beans_share.chatId`; run `pnpm db:generate` and edit the migration to be idempotent

## Phase 2: Metered suggestion API

- [x] Add `src/shared/ai-suggestions/schema.ts` (Zod request/response schemas — client-importable) and `src/lib/ai-suggestions/prompts.ts` (server-only: `SuggestionPromptVars`, `ShotSummarySchema`, prompt builder function); install `ai` + `@ai-sdk/openai`
- [x] Implement `POST /api/chats` — enforce weekly limits via `chats` count (Monday 00:00 UTC), build prompt from shot history + optional memory, call AI, persist chat + messages on success (delete on AI failure to preserve quota)
- [x] Implement `GET /api/chats/usage` — return current-week count and weekly limit
- [x] Tests: rate-limit enforcement (free/single/double tiers), quota not consumed on AI failure, weekly reset boundary, prompt builder output shape

## Phase 3: Background memory (no quota)

- [x] Implement server-side modules (and any cron/route handlers **not** exposed as user quota consumers) that refresh `ai_user_memory` and `ai_beans_memory` markdown using the AI SDK; ensure these code paths never increment suggestion usage counters
- [x] Tests: memory refresh does not increment `chats` count

## Phase 4: Frontend

- [x] Add `useAiSuggestionUsage` / `useRequestAiSuggestion` in `src/components/ai-suggestions/hooks.ts`
- [x] Build `AiShotSuggestion.tsx` and integrate it on the bean detail or shot flow where most useful
- [x] Tests: component renders usage count, disables button at limit, displays AI response and error states

# Additional Tasks

- [x] Flatten `ApiRoutes.ai` chat routes (`chats` + `chatsUsage` string children) so consumers use `.path` without duplicating `/api/ai`; document `routesBuilder` pitfall in `routes.ts`
- [x] Restructure `ApiRoutes.ai` to use proper nesting (`chats: { path, usage }`) consistent with all other routes; remove misleading comment about `routesBuilder` duplication
- [x] Add past suggestions history: store `beanId` in system message metadata, `GET /api/chats?beanId=` endpoint, `useAiSuggestionHistory` hook, collapsible history section in `AiShotSuggestion.tsx` with dates
- [x] Relocate metered AI HTTP routes to `src/app/api/chats/` (`POST/GET /api/chats`, `GET /api/chats/usage`) and background memory refresh to `src/app/api/ai-memory/refresh/` (`POST /api/ai-memory/refresh`); use `ApiRoutes.chats` and `ApiRoutes.aiMemoryRefresh` — avoid `/api/ai/...` so URLs and `routesBuilder` paths never stack into `/api/ai/api/ai/...`.

## Phase 5: Markdown rendering for AI suggestions

- [x] Install `react-markdown` (lightweight React markdown renderer)
- [x] Replace the plain `<p className="whitespace-pre-wrap">` in `AiShotSuggestion.tsx` with `<ReactMarkdown>` wrapped in a `<div>` with Tailwind `prose` classes (via `@tailwindcss/typography`) for proper heading, bold, list, and paragraph rendering
- [x] Verify `@tailwindcss/typography` is available (install if not) so `prose` classes style the rendered markdown appropriately in both light and dark modes (`prose dark:prose-invert`)
- [x] Ensure rendered markdown matches the component's existing color scheme (stone palette, dark mode support)
