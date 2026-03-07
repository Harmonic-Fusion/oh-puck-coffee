# QA Testing Plan: Beans Sharing

This document describes manual and exploratory test cases for the beans sharing feature (Google Docs–style sharing). Use it to verify all variants and edge cases before release.

---

## 1. Prerequisites & Test Data

- **Users:** At least 3 accounts (e.g. Alice = creator, Bob = receiver, Carol = other).
- **Bean:** One or more beans owned by Alice with mixed metadata (name, origin, roaster, roast level, shots).
- **Entitlement:** Know whether `bean-share` is enabled for your test account (free tier may include it via `FreeEntitlementDefaults`).
- **Config:** Note `MAX_BEAN_SHARES` (default 10) to test limit behavior.

---

## 2. General Access (per-bean “link” sharing)

| # | Variant | Steps | Expected |
|---|--------|--------|----------|
| 2.1 | **Restricted (default)** | Create bean → open Share dialog → General access = “Restricted”. | Only people added via “Add people” can access. Copy link disabled or not shown. |
| 2.2 | **Anyone with the link** | Set General access = “Anyone with the link” (optionally enable “Share shot history”). Copy link. | Share slug appears; link is copyable. Authenticated user opening link can view bean (and shots if toggle on). |
| 2.3 | **Public** | Set General access = “Public”. Copy link. | Unauthenticated user can open link and view bean (and shots if toggle on). |
| 2.4 | **Restricted → Link → Restricted** | Set to “Anyone with the link”, copy link, then set back to “Restricted”. | Old link returns 403 / “Access denied”. Share slug cleared when restricted. |
| 2.5 | **Share slug stability** | Set to “Anyone with the link”, copy link. Change to “Public” (or back). | Same share link continues to work; slug does not change when toggling between link/public. |
| 2.6 | **Shot history toggle** | With “Anyone with the link” or “Public”: toggle “Share shot history” off → on → off. | Public share page shows creator’s non-hidden shots only when toggle is on; empty shot list when off. |

---

## 3. Individual Shares (Add people)

| # | Variant | Steps | Expected |
|---|--------|--------|----------|
| 3.1 | **Add one user** | As creator, open Share dialog → Add people → search and select Bob → Send (defaults: share shot history off, reshare off). | Bob sees pending invite (Beans page banner and/or Beans nav badge). Share appears in dialog as “Pending”. |
| 3.2 | **Accept invite** | As Bob, open Beans page → accept invite (banner or invites list). | Bean appears in Bob’s bean list. Invite banner/badge count decreases. Share shows “Accepted” in creator’s dialog. |
| 3.3 | **Decline invite** | As Carol, receive invite → decline. | Share removed; bean does not appear in Carol’s list. Creator sees share removed from list. |
| 3.4 | **Share shot history on** | Creator adds Bob with “Share shot history” on. Bob accepts. Bob opens bean detail. | Bob sees creator’s non-hidden shots for this bean in addition to his own (if any). |
| 3.5 | **Share shot history off** | Creator adds Bob with “Share shot history” off. Bob accepts. Bob opens bean detail. | Bob sees only his own shots for this bean; creator’s shot log not visible. |
| 3.6 | **Reshare on** | Creator adds Bob with “Reshare” enabled. Bob accepts. Bob opens Share dialog for same bean. | Bob can add other users (e.g. Carol) to the bean (subject to entitlement and max share limit). |
| 3.7 | **Reshare off** | Creator adds Bob with “Reshare” off. Bob accepts. Bob opens Share dialog for same bean. | Bob cannot add others; Forbidden or no share UI / disabled. |
| 3.8 | **Update existing share** | Creator opens Share dialog → for existing share (Bob), change “Share shot history” or “Reshare”. Save. | Bob’s access updates; reshare may require `bean-share` entitlement. |
| 3.9 | **Revoke share** | Creator removes Bob from share list (revoke). | Bob loses access; bean disappears from his list (if no shots). If Bob has shots, confirm behavior (e.g. bean stays with message, or only creator’s view). |
| 3.10 | **Duplicate share** | Creator adds Bob again (same bean, same user). | Idempotent: existing share returned (200) or clear error; no duplicate row. |
| 3.11 | **Share with self** | Creator tries to add themselves (same user as creator). | 400 “Cannot share a bean with yourself”. |

---

## 4. Entitlement & Limits

| # | Variant | Steps | Expected |
|---|--------|--------|----------|
| 4.1 | **Without bean-share** | Use account without `bean-share` (or temporarily remove). Open Share dialog. | “Share shot history” and/or “Reshare” show upgrade prompt or are disabled. Can still add people with both off. |
| 4.2 | **With bean-share** | Use account with `bean-share`. Toggle “Share shot history” and “Reshare” on for a share. | Options work; no upgrade prompt. |
| 4.3 | **Max bean shares** | Create individual shares + general-access beans until total = `MAX_BEAN_SHARES`. Try to add one more share or set one more bean to link/public. | 403 with code `MAX_BEAN_SHARES` and message about limit. After revoking or setting one to restricted, can add again. |

---

## 5. Public Share Page (`/share/beans/:slug`)

| # | Variant | Steps | Expected |
|---|--------|--------|----------|
| 5.1 | **Guest view (public bean)** | Log out (or incognito). Open share link for bean with General access = Public. | Read-only bean metadata; shot log if “Share shot history” on; stats if implemented; no “Follow” (must log in). |
| 5.2 | **Guest view (link-only bean)** | Log out. Open share link for bean with “Anyone with the link”. | 403 or redirect to login (only authenticated users can view link-only). |
| 5.3 | **Logged-in visitor: Follow** | Log in as Bob. Open public bean share link. Click “Add to collection” / “Follow”. | Bean appears in Bob’s bean list; `user_beans` row created. |
| 5.4 | **Logged-in visitor: Share my shot history** | As Bob, open public share page → toggle “Share my shot history” on. Log out and open same link as guest. | Creator’s shots + Bob’s non-hidden shots appear in public shot list (and in stats if applicable). |
| 5.5 | **Creator on share page** | Log in as creator. Open own bean’s public share link. | Link/button to “Manage sharing” or bean detail page; no duplicate share UI on public page. |
| 5.6 | **Not found** | Open `/share/beans/nonexistent-slug`. | 404 or “Bean not found” message. |
| 5.7 | **Restricted slug** | Set bean to Restricted. Open previous share link (same slug). | 403 “Access denied” or equivalent. |

---

## 6. Access Control Summary

| Actor | Restricted | Anyone with link | Public |
|-------|------------|-------------------|--------|
| Creator | ✅ Full | ✅ Full | ✅ Full |
| Individual share (accepted) | ✅ Per-share settings | ✅ | ✅ |
| Individual share (pending) | ❌ No access until accept | ❌ | ❌ |
| Authenticated, no share | ❌ | ✅ View | ✅ View |
| Guest | ❌ | ❌ | ✅ View |

---

## 7. Nav & Invites

| # | Variant | Steps | Expected |
|---|--------|--------|----------|
| 7.1 | **Beans nav badge** | As Bob, have 1+ pending bean invites. | Beans nav item (Sidebar and NavBar) shows badge with count. |
| 7.2 | **Badge after accept/decline** | Accept or decline all invites. | Badge disappears or count updates. |
| 7.3 | **Invites list** | As receiver, open Beans page. | Pending invites visible (banner or list) with Accept / Decline. |

---

## 8. API & Validation (optional; can overlap with unit tests)

- **POST /api/beans/:id/shares:** Valid body (receiverUserId uuid, optional booleans) → 201; invalid uuid / missing receiverUserId → 400; share with self → 400; no entitlement when reshare on → 403; max shares → 403.
- **GET /api/beans/:id/shares:** Creator or admin → 200 with individualShares + generalAccess; non-owner → 403.
- **PATCH /api/beans/:id/shares/:shareId:** Creator updates share → 200; reshare on without entitlement → 403.
- **DELETE /api/beans/:id/shares/:shareId:** Creator revokes → 204; receiver declines pending → 204; receiver cannot delete accepted share → 403.
- **POST /api/beans/:id/shares/:shareId/accept:** Receiver accepts pending → 200, bean in list; wrong user or already accepted → 404.
- **PATCH /api/beans/:id/general-access:** Creator updates general access → 200; non-creator → 403; invalid body → 400.
- **GET /api/shares/beans/:slug:** Public/link bean → 200 with bean + shots (if enabled); restricted or bad slug → 403/404.

---

## 9. Regression / Boundaries

- **Shot shares unchanged:** Existing shot-level sharing (short link) still works independently.
- **Hidden shots:** Creator’s hidden shots never appear in shared shot log or public page.
- **Bean list:** User’s bean list shows only beans they own or have accepted share or added via “Follow”.
- **Admin:** Admin/super-admin can access any bean and manage shares (same as creator for share list / general access).

---

## 10. Suggested Run Order

1. General access (2.1–2.6).
2. Individual shares: add → accept/decline (3.1–3.3).
3. Share options: shot history and reshare (3.4–3.8).
4. Revoke and edge cases (3.9–3.11).
5. Entitlement and limits (4.1–4.3).
6. Public share page (5.1–5.7).
7. Nav badge and invites (7.1–7.3).
8. API/validation and regression (8, 9) as needed.

Mark each variant Pass/Fail/Blocked and note environment (e.g. dev, staging) and date.
