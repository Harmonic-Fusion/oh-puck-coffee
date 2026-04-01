# Problem Statement

Users pulling shots with a specific bean have no guided way to improve their next attempt. An AI-powered suggestion feature can analyze a user's shot history for a given bean and recommend parameter adjustments (grind, dose, yield, temperature, etc.) to dial in their espresso. Usage must be metered per subscription tier to align with the billing model.

# Scope

- **Component**: A React component (`AiShotSuggestion`) that accepts a `beans_id`, fetches the user's shot history for that bean, sends the data to an AI chat endpoint, and displays the returned suggestion.
- **Database**: Two new tables to capture AI conversations:
  - **`chats`** — generic conversation container. Links to `users` (owner). Tracks the chat type/purpose and timestamps. Does **not** contain domain FKs — instead, domain tables point to chats (e.g. `beans.chat_id`). This keeps `chats` reusable for future AI features beyond shot suggestions.
  - **`chat_messages`** — individual messages within a chat. Each message has a `role` (`system | developer | user | assistant`), `content`, `model_identifier` (e.g. `gpt-4o`), `metadata` (jsonb for flexible storage like temperature, stop reason, etc.), `token_count` (integer), and timestamps.
- **Association**: `beans_share.chat_id` (nullable FK → `chats.id`) links a specific user+bean pair to its AI suggestion conversation. Since `beans_share` is the user-to-beans junction table (one row per user per bean), this scopes AI conversations per-user-per-bean — two users sharing the same bean get independent conversations. Other domain tables can adopt the same `chat_id` pattern in the future.
- **Rate Limits** (configurable in `src/shared/entitlements.ts` inside `EntitlementDefs` or a co-located config):
  - Free tier: **3 suggestions per week**
  - Single Shot plan: **9 suggestions per week**
  - Double Shot plan: **27 suggestions per week**
- **Rate-limit counting**: Count by number of `chats` rows (not messages) created by the user in the current week. Each suggestion request creates one chat with its system/user/assistant messages.
- **API Endpoints**:
  - `POST /api/ai/suggestions` — generate a new suggestion (creates a chat + messages, sends shot data to AI, returns suggestion).
  - `GET /api/ai/suggestions/usage` — returns the user's current-week usage count and their weekly limit.
- **Entitlement**: The existing `AI_SHOT_SUGGESTIONS` entitlement key (`ai-shot-suggestions`) already exists in `EntitlementDefs`. It gates access to higher limits; free-tier users still get a baseline allowance (3/week).
- **AI Provider**: Use the Vercel AI SDK (`ai` + `@ai-sdk/openai`) for the chat call. Add `OPENAI_API_KEY` to `config.ts`.
- **Out of scope**: Admin management UI for suggestions, streaming responses (v1 returns a complete response), suggestion history UI beyond the current request, multi-turn follow-up conversations (v1 is single-turn per chat, but the schema supports future multi-turn).

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

**Other design decisions:**
- Configuring limits alongside `EntitlementDefs` in `src/shared/entitlements.ts` keeps billing/feature-gating logic centralized and importable by both client (to show remaining count) and server (to enforce limits).
- Using the Vercel AI SDK aligns with the Next.js ecosystem and provides a clean abstraction over OpenAI with minimal boilerplate.
- The `GET /api/ai/suggestions/usage` endpoint lets the UI show "X of Y suggestions used this week" before the user clicks, reducing frustration from hitting limits.
- The "week" window resets on Monday 00:00 UTC for predictable, user-friendly resets.

**Tier detection**: The API determines the user's plan tier by checking their subscription's `stripeProductId` against known product IDs (configured via env vars or a mapping in config). If no active subscription, the user is on the free tier. The weekly limit is then looked up from `AiSuggestionLimits` in `entitlements.ts`.

**Table definitions:**

```
chats
├── id              text PK
├── user_id         text FK → users.id (cascade delete)
├── type            text ("shot_suggestion") — extensible for future chat types
├── title           text (nullable, auto-generated summary)
├── created_at      timestamp
└── updated_at      timestamp

chat_messages
├── id              text PK
├── chat_id         text FK → chats.id (cascade delete)
├── role            text ("system" | "developer" | "user" | "assistant")
├── content         text
├── model_identifier text (nullable — null for user/system messages, e.g. "gpt-4o" for assistant)
├── token_count     integer (nullable)
├── metadata        jsonb (nullable — temperature, stop_reason, etc.)
├── created_at      timestamp
└── (ordering implicit via created_at + id)

beans_share (existing table, modified)
└── chat_id         text FK → chats.id (nullable) — links a user+bean pair to its AI suggestion conversation
```

# Tasks

## Phase 1: Data Layer & Configuration

- [ ] Add `AiSuggestionLimits` config to `src/shared/entitlements.ts` with `free: 3`, `singleShot: 9`, `doubleShot: 27` (co-located with `EntitlementDefs`)
- [ ] Add `OPENAI_API_KEY` to `src/shared/config.ts`
- [ ] Add `chats` table to `src/db/schema.ts` (see table definition above)
- [ ] Add `chat_messages` table to `src/db/schema.ts` (see table definition above)
- [ ] Run `pnpm db:generate` and make the migration idempotent
- [ ] Add routes to `src/app/routes.ts`: `ai.suggestions` (`/api/ai/suggestions`) and `ai.suggestions.usage` (`/api/ai/suggestions/usage`)

## Phase 2: API Endpoints

- [ ] Install `ai` and `@ai-sdk/openai` packages
- [ ] Create `POST /api/ai/suggestions/route.ts` — validate request (`{ beanId: string }`), authenticate, determine tier + weekly usage, enforce limit, fetch user's shots for bean, build prompt, call AI, create chat + chat_messages rows in a transaction, return suggestion
- [ ] Create `GET /api/ai/suggestions/usage/route.ts` — authenticate, count `chats` rows this week (since Monday 00:00 UTC) for the user, return `{ used: number, limit: number, resetsAt: string }`
- [ ] Add Zod schemas in `src/shared/ai-suggestions/schema.ts` for request/response validation

## Phase 3: Frontend Component & Hooks

- [ ] Create `src/components/ai-suggestions/hooks.ts` with `useAiSuggestionUsage()` and `useRequestAiSuggestion()` (TanStack Query)
- [ ] Create `src/components/ai-suggestions/AiShotSuggestion.tsx` — accepts `beansId` prop, shows usage counter, request button (disabled when at limit), and displays the AI suggestion response
- [ ] Integrate `AiShotSuggestion` component into the bean detail page (or shot form context) where it's most useful
