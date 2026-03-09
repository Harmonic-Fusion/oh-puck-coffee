Bean sharing user flows and edge cases. All decisions finalized.

**Simplified model: one-way sharing only.** Owner creates beans; sharing flows only from owner to others. No public beans.

---

## Roles

| Status | How you get it | Can edit bean? | Can see others' shots? | Can log own shots? |
|--------|----------------|----------------|------------------------|--------------------|
| **owner** | You created the bean | Yes | Yes (if they share) | Yes |
| **accepted** | Invited + accepted | No | Yes (if they share) | Yes |
| **self** | Added yourself via link | No | Yes (if they share) | Yes |
| **pending** | Invited, hasn't responded | No | No | No |
| **unfollowed** | Voluntarily left | No | No | Read-only (own shots only) |
| **unshared** (any status + `unsharedAt` set) | Owner revoked | No | No | Read-only (own shots only) |

---

## Bean general access (one-way, no downgrade)

Two levels only. **Public is removed.**

| Level | Who can be added | Who can add themselves? |
|-------|------------------|--------------------------|
| **None** (restricted) | Owner adds individuals only | No one |
| **Anyone with link** | Owner adds individuals + anyone with the link | Yes (authenticated user with link can "Follow") |

**No downgrade:** Once the owner increases access (None → Anyone with link), they **cannot** decrease it. Show a confirmation screen before increasing, explaining that new users will add their shots to this bean id and downgrading would strand those shots.

- **None** → **Anyone with link**: allowed; show confirmation, then set `generalAccess = 'anyone_with_link'`, generate `shareSlug` if needed.
- **Anyone with link** → **None**: not allowed (UI disabled, API returns 400 if attempted).

---

## Flow 1: Owner creates & shares a bean

1. **Create bean** — owner gets `beans_share` row with `status = 'owner'`. Bean starts with `generalAccess = 'none'` (restricted).
2. **Open share dialog** — two sub-flows:

### 1a. Direct invite (add person) — always available to owner
- Owner searches users, selects one.
- Creates `beans_share` row: `status = 'pending'`, `invitedBy = owner`.
- Optionally sets `reshareAllowed = true` (requires `bean-share` entitlement).
- **Edge case – invitee already has an active row:** API returns existing row, no duplicate.
- **Edge case – invitee has a row with `unsharedAt` set:** clear `unsharedAt`, set `status = 'accepted'` (re-invite = immediate accept).

### 1b. Set general access to "anyone with link"
- Owner chooses to increase to "Anyone with link" (one-way; cannot later reduce).
- **Confirmation screen:** explain that people with the link can add themselves and log shots to this bean, and that this cannot be undone.
- On confirm: set `beans.generalAccess` to `anyone_with_link`, generate `beans.shareSlug` if not already set.
- Any authenticated user with the link can view the share page and "Follow" → `status = 'self'`.
- Direct-invite limit (if any) counts only direct invites; link-based joins do not count.

---

## Flow 2: Receiving an invite (direct share)

1. Invitee sees banner (via `useShareInvites`) with bean name, who shared it.
2. **Accept** — `status` changes from `pending` to `accepted`; bean appears in their collection.
3. **Decline** — row is hard-deleted.
4. **Ignore** — row stays `pending` indefinitely.

**Edge cases:**
- Bean deleted — cascade delete removes the share row.
- **Pending invite + user clicks "Follow" on share page** — auto-accept the pending invite (`status = 'accepted'`), don't create a second row.

---

## Flow 3: Self-join via link

1. User visits share page (e.g. `/share/beans/:slug`). Only available when `generalAccess = 'anyone_with_link'`.
2. Sees bean info + shot stats/shots from members who share (see Flow 8).
3. Clicks **"Follow"** — creates `beans_share` with `status = 'self'`, `invitedBy = null`.
4. Bean appears in their collection; they can set **Share my shot history** (No / Restricted / Anyone with link) in the Share dialog.

**Edge cases:**
- User already has an active row — add-to-collection returns existing row.
- User was previously unshared or unfollowed — clear `unsharedAt`, set `status = 'self'`; re-follow allowed.
- User has a `pending` invite — auto-accept: set `status = 'accepted'`, return the updated row.

---

## Flow 4: Member views the bean detail page

1. Bean appears in their collection.
2. Bean detail shows: bean info (read-only for non-owners), shot history (own + others who share), contributors, shot comparison, flavor ratings.
3. Member can **log shots** against this bean.
4. Member can open **Share dialog** to see who has access and set **Share my shot history** (No / Restricted / Anyone with link). Owner-only: change general access (only upward, with confirmation), add people, and set **Allow Reshare** per member via a toggle that saves immediately. No remove-user control in the dialog; members leave by unfollowing (Flow 6).

---

## Flow 5: Owner remove (not in UI)

The share dialog does not offer a way for the owner to remove members. Members leave by **unfollowing** (Flow 6). The API still supports owner/admin revocation (`DELETE /api/beans/:id/shares/:shareId`) for support or admin tooling; when used, it runs `unshareMemberAndDescendants`: sets `unsharedAt` on the target, sets `reshareAllowed = false`, and recursively does the same for anyone that person invited. **Removed member:** bean stays in collection with "unshared" notice; read-only own shots; cannot see others' shots or log new shots; can use **Duplicate** (Flow 9).

---

## Flow 6: Member unfollows (voluntary leave)

1. Non-owner clicks **"Unfollow"**.
2. Delete own share: if `pending` → hard delete; if `accepted` or `self` → set `status = 'unfollowed'`, set `unsharedAt`; re-parent invited users to owner.
3. Same post-unfollow experience as being removed: read-only own shots, can duplicate. Re-follow via link is allowed (clears `unsharedAt`, `status = 'self'`).

---

## Flow 7: Shot history visibility (per member, change anytime)

Each member controls their own `shotHistoryAccess`. **Three options only (no Public):** **No**, **Restricted**, **Anyone with the link**. Can change at any time.

| Value (DB) | UI label | Who sees their shots |
|------------|----------|----------------------|
| `none` | No | No one else |
| `restricted` | Restricted | Only other bean members (active `beans_share` for this bean) |
| `anyone_with_link` | Anyone with the link | Other bean members + any authenticated user with the bean share link |

**Where this applies:**
- **Bean detail** (`GET /api/beans/:id/shots`): include shots from members with `shotHistoryAccess` in `('restricted', 'anyone_with_link')`; exclude `none`.
- **Share page** (when `generalAccess = 'anyone_with_link'`): authenticated callers see shots from members with `anyone_with_link` (and members with `restricted` if they are members). No unauthenticated public view (no Public bean/page).

---

## Flow 8: Duplicate bean

Available to **any user** (including owner).

**Three shot handling options** (user chooses):

| Option | Behavior |
|--------|----------|
| **Migrate shots** | Move the user's own shots to the new bean (update `beanId` on existing shot rows). Originals no longer on the original bean. |
| **Duplicate shots** | Copy the user's own shots to the new bean. Originals remain on the original bean. |
| **No shots** | New bean with no shots. |

Flow:
1. Click **Duplicate** on bean detail.
2. Choose shot option (migrate / duplicate / none).
3. Create new `beans` row owned by the current user.
4. Apply shot option for that user's shots only.
5. Redirect to the new bean detail.

**Edge cases:** Only the user's own shots are affected. Duplicating while still having access leaves the original bean and access unchanged.

---

## Flow 9: Who can add people (invite others)

A user can add other people to the bean if **either**:
- They have **Allow Reshare** (`reshareAllowed = true`), set by the **owner** only, or
- The bean's **general access** is **Anyone with link** (in that case anyone with the link can "add themselves" via Follow; direct invites still require reshare or owner).

So:
- **Owner** always can add people (direct invite) and set general access.
- **Non-owner** can create direct invites only if the owner has given them **Allow Reshare**, or if general access is Anyone with link (then they can share the link; link users add themselves).
- Only the owner can enable/disable **Allow Reshare** per user.

**Edge cases:**
- Member's reshare revoked — existing invitees stay; member can't invite new ones.
- Resharer invites someone previously unshared — re-invite clears `unsharedAt`, sets `status = 'accepted'`.

---

## Bean editing permissions

Only the owner can edit bean metadata. Enforced in UI and PATCH API (403 for non-owner).

---

## User account deletion

Users are soft-deleted. Preserves `invitedBy` chain so recursive unsharing works. Soft-deleted users' share rows remain but they cannot log in or act.
