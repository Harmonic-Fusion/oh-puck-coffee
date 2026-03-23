# Problem Statement

The beans domain needs stronger automated tests, and three product issues block reliable workflows: (1) on `/beans` compare, picking reference shots attributed to two different users can show the same shot in both columns instead of each user’s reference shot; (2) **creating a bean from the shot log** (“add new bean”) fails intermittently (including time-related fields), and when it fails there is **no clear user feedback**; (3) when accepting a bean share, receivers get a **shot visibility** option (visibility only—no copying), **on by default** so they see the owner’s shots unless they turn it off. Unit tests for beans (schemas, API behavior, and critical client hooks/helpers) will lock in fixes and prevent regressions.

# Scope

**In scope**

- Vitest-based unit tests under the beans domain: `src/shared/beans`, beans API routes (especially compare and share accept), and targeted tests for shot-log / bean form logic that relate to the reported bugs. Follow existing patterns (`src/shared/beans/__tests__/`, `src/app/api/beans/.../__tests__/`).
- Fix bean compare so reference-shot comparison is **per intended contributor/user**, not incorrectly deduplicated or filtered so two columns resolve to the same shot. Behavior must respect sharing rules (`shotHistoryAccess`, `beans_share` membership) and not expose unauthorized shots.
- Fix shot log **add new bean** flow (`BeanSection`, `BeanFormModal`, `useCreateBean`): reliable fields (including time/duration and roast-related inputs), and **surface validation and API errors** (toast, banner, or field errors)—not silent failure.
- UX + API for accepting a share: explicit **shot visibility** (receiver sees the owner’s shots for that bean; **no shot rows copied**). **Default: checked** (opt out to hide).

**Out of scope**

- Unrelated domains (billing, stats-only changes) unless required for beans.
- Broad E2E coverage (Playwright) unless listed as a follow-up task; primary ask is **unit** tests.

# Solution

**Compare bug:** The compare API currently constrains fetched shots to the signed-in user for non-admin sessions, while the UI presents per-bean columns that imply per-contributor reference shots. Align data loading with the compare UX: resolve reference (or primary) shots **per bean and per contributor** according to access rules, and ensure the client maps shots to the correct column. Add unit tests that encode multi-user shot rows and expected grouping/reference selection.

**Shot log / add beans:** The failure mode is **add new bean** from the shot form, often involving **time-related fields**, with **no feedback** on why create failed. Trace `BeanSection` → `handleCreate` → `useCreateBean` / `POST /api/beans`: fix controlled inputs (e.g. `brewTimeSecs` in the parent shot form vs bean modal date/time strings), ensure React Query mutation errors and Zod/client validation errors are **shown** (reuse `useToast`, `ValidationBanner`, or `BeanFormModal` error slots). Add tests for schema and, where practical, the create payload path.

**Share accept + shot visibility (decision: B + A):** Visibility only; **default checked**. When accepting, persist the user’s choice on the share row (e.g. `shotHistoryAccess`). Do **not** copy shots. Label the UI clearly. Extend `POST .../shares/:shareId/accept` and `useAcceptBeanShare` to send the default-on flag unless the user opts out.

**Testing strategy:** Prefer fast, deterministic tests: pure functions and mocked DB for API routes (existing shares tests pattern). Add focused tests for compare shot grouping/reference resolution and accept handler behavior.

# Tasks

## Phase 1: Compare + tests

- [x] Add Vitest coverage for `GET /api/beans/compare` with mocked DB: multiple users’ shots on the same bean IDs; assert reference (or displayed) shot **per contributor** matches expected rows after the access fix.
- [x] Implement compare API (and any client mapping in `useBeansCompare` / compare page) so non-admin viewers receive **per-contributor** shot data where `shotHistoryAccess` and membership allow—no duplicate wrong column shots.

## Phase 2: Shot log — add new bean

- [x] Reproduce and fix add-new-bean failures in `BeanSection` + `BeanFormModal` (including time/duration and roast date handling); align with `createShotSchema` / bean create schema.
- [x] Ensure **all** failure paths show feedback: `createBean` mutation errors, network errors, and validation messages (not silent dismiss).
- [x] Add unit tests for bean create schema and, if extracted, helpers used by the embedded create flow.

## Phase 3: Share accept — shot visibility

- [x] Extend `POST /api/beans/[id]/shares/[shareId]/accept` to accept shot-visibility intent; persist on `beans_share` as `see_others_shots` (new column); **default to visible** when omitted.
- [x] Update `BeanShareInvitesBanner` / `useAcceptBeanShare`: **checkbox default checked**, user can uncheck before accept; tests for handler + permissions (reuse patterns from `shares-permissions.test.ts`).

## Phase 4: Verification

- [x] Automated: Vitest for compare, accept, and `createBeanSchema` dates; full suite green. Manual smoke on staging still recommended.

---

## Plan summary

| Theme | Outcome |
|--------|--------|
| **Compare** | Compare API returns contributor-scoped shots for shared beans; reference columns no longer show the wrong user’s single shot; covered by route tests. |
| **Shot log** | Add-new-bean works reliably; failures always show **actionable** errors. |
| **Share accept** | Shot visibility is visibility-only, **default on**, persisted on accept; tested accept route + hook contract. |
| **Tests** | Vitest additions for compare, accept, and bean create path; no requirement for new E2E in this spec. |

---

## Decisions

- **Include shots on accept:** **B — Visibility only.** Receivers see the owner’s shots for the shared bean; shots are not copied. Use existing access fields (e.g. `shotHistoryAccess`) or extend consistently.
- **Shot visibility default:** **A — Checked by default** on the accept flow; users opt out if they do not want to see the sharer’s shots.
- **Shot log failure:** Failure occurs in the **add new bean** path from the shot log; users get **no explanation** today. Spec requires **explicit feedback** on validation and API failure (in addition to fixing root causes).
