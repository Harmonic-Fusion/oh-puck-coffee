Bean sharing user flows and edge cases. All decisions finalized.

---

## Roles

| Status | How you get it | Can edit bean? | Can see others' shots? | Can log own shots? |
|---|---|---|---|---|
| **owner** | You created the bean | Yes | Yes (if they share) | Yes |
| **accepted** | Invited + accepted | No | Yes (if they share) | Yes |
| **self** | Added yourself via link | No | Yes (if they share) | Yes |
| **pending** | Invited, hasn't responded | No | No | No |
| **unfollowed** | Voluntarily left | No | No | Read-only (own shots only) |
| **unshared** (any status + `unsharedAt` set) | Owner revoked | No | No | Read-only (own shots only) |

---

## Flow 1: Owner creates & shares a bean

1. **Create bean** -- owner gets `beans_share` row with `status = 'owner'`
2. **Open share dialog** -- two sub-flows:

### 1a. Direct invite (add person)
- Owner searches users, selects one
- Creates `beans_share` row: `status = 'pending'`, `invitedBy = owner`
- Optionally sets `reshareAllowed = true` (requires `bean-share` entitlement)
- **Edge case – invitee already has an active row**: API returns existing row, no duplicate
- **Edge case – invitee has a row with `unsharedAt` set** (previously removed/unfollowed): clear `unsharedAt`, set `status = 'accepted'` (re-invite = immediate accept, no pending step)

### 1b. Set general access to "anyone with link"
- Owner changes `beans.generalAccess` to `anyone_with_link`
- Generates `beans.shareSlug` if not already set
- Any authenticated user with the link can view the share page and "Follow" → `status = 'self'`
- Does **not** count toward the max bean shares limit (limit only counts direct invites)

### 1c. Set general access to "public"
- Same as "anyone with link", but unauthenticated users can also view
- Appears in public beans search
- Does **not** allow adding authenticated users — just makes the page viewable without login

**Max bean shares limit**: only counts direct invites (`beans_share` rows where `invitedBy` is the current user and status is not `owner`). Public/link access does not count.

---

## Flow 2: Receiving an invite (direct share)

1. **Invitee sees banner** (via `useShareInvites`) with bean name, who shared it
2. **Accept** -- `status` changes from `pending` to `accepted`, bean appears in their collection
3. **Decline** -- row is hard-deleted, no trace remains
4. **Ignore** -- row stays `pending` indefinitely

**Edge cases:**
- Inviter gets unshared before invitee accepts -- the pending row has no `unsharedAt` yet; on accept, the inviter chain validity doesn't matter (the invitee's access is independent once accepted)
- Bean is deleted -- cascade delete removes the share row, invite disappears
- **Pending invite + user clicks "Follow" on share page** -- auto-accept the pending invite (clear `pending`, set `status = 'accepted'`), don't create a second row

---

## Flow 3: Self-join via link/public page

1. User visits `/share/beans/:slug`
2. Sees bean info + shot stats/shots from members who opted in: unauthenticated = `shotHistoryAccess = 'public'` only; authenticated = `'anyone_with_link'` or `'public'` (see Flow 8)
3. Clicks **"Follow"** -- creates `beans_share` with `status = 'self'`, `invitedBy = null`
4. Bean appears in their collection
5. They can set **Share my shot history** in the Share dialog (No / Restricted / Anyone with the link / Public). On this page, the toggle "Share my shot history on this page" turns on public visibility (off = restricted or none).

**Edge cases:**
- User already has an active row (invited/accepted) -- `add-to-collection` returns existing row, no change
- **User was previously unshared (owner removed)** -- clear `unsharedAt`, set `status = 'self'`, user regains access. (Re-follow always allowed.)
- **User previously unfollowed** -- clear `unsharedAt`, set `status = 'self'`, user regains access. (Re-follow always allowed.)
- **User has a `pending` invite** -- auto-accept: set `status = 'accepted'`, return the updated row

---

## Flow 4: Member views the bean detail page

1. Bean appears in their collection (beans list)
2. Bean detail page shows:
   - Bean info (read-only for non-owners)
   - **Shot history** -- their own shots + shots from other members whose `shotHistoryAccess` is not `none` (i.e. `restricted`, `anyone_with_link`, or `public`; see Flow 8)
   - **Contributors** -- list of people who share their shots (shotHistoryAccess not `none`)
   - Shot comparison matrix, flavor ratings
3. Member can **log shots** against this bean (creates `shots` row with their `userId` + this `beanId`)
4. Member can open **Share dialog** to see who else has access and set **Share my shot history** (No / Restricted / Anyone with the link / Public) (read-only view if not owner)

---

## Flow 5: Owner removes a person

1. Owner opens share dialog, clicks remove on a member
2. `DELETE /api/beans/:id/shares/:shareId` triggers `unshareMemberAndDescendants`:
   - Sets `unsharedAt` on the target's row
   - Sets `reshareAllowed = false`
   - Recursively does the same for anyone that person invited (`invitedBy` chain)
3. **Removed member's experience:**
   - Bean stays visible in their collection (they keep access)
   - They see an "unshared" notice
   - They can still view their own shots (read-only)
   - They **cannot** see other members' shots anymore
   - They **cannot** log new shots
   - They get **Duplicate** button to copy the bean into their own ownership (with shot options — see Flow 9)
4. **Shot data**: their existing shots remain under the original `beanId` (not deleted)

**Edge cases:**
- Owner removes person A, who invited person B -- both A and B get unshared (recursive)
- Removed person had `shotHistoryAccess = 'public'` (or any non-none) -- their shots no longer appear in the shared view (query filters by `unsharedAt = null`)
- **Removed person re-follows via share link** -- `unsharedAt` is cleared, `status` set to `'self'`, access restored (re-follow always allowed)

---

## Flow 6: Member unfollows (voluntary leave)

1. Non-owner clicks **"Unfollow"** on bean detail page
2. `DELETE` on their own share triggers:
   - If `status = 'pending'` -- hard delete (decline)
   - If `status = 'accepted'` or `'self'` -- sets `status = 'unfollowed'`, sets `unsharedAt`
   - **Re-parents descendants**: anyone they invited gets `invitedBy` reassigned to the owner (so the recursive chain isn't broken)
3. Same post-unfollow experience as being removed: read-only own shots, can duplicate

**Edge cases:**
- **Member who unfollowed wants to re-join** -- they visit the share link again. `add-to-collection` clears `unsharedAt`, sets `status = 'self'`. Access restored.
- Member unfollows, then owner tries to remove them -- they're already `unfollowed` with `unsharedAt` set, no-op

---

## Flow 7: Downgrading general access

1. Owner changes `generalAccess` from `anyone_with_link` or `public` down to `restricted`
2. `unshareSelfMembersOnRestricted` fires: all `status = 'self'` members (with `unsharedAt = null`) get `unsharedAt` set
3. Directly invited members (`status = 'accepted'`) are unaffected
4. `shareSlug` remains set (so the URL doesn't break, it just 403s for non-members)

**Edge cases:**
- User was `self` and had shots logged -- they lose access to shared shots but keep their own data (read-only)
- Owner toggles back to `anyone_with_link` -- self-unshared users are NOT automatically restored; they need to re-follow (which clears `unsharedAt`)

---

## Flow 8: Shot history visibility

Each member independently controls their `shotHistoryAccess`. The UI offers four options: **No**, **Restricted**, **Anyone with the link**, **Public**.

| Value (DB) | UI label | Who sees their shots |
|------------|----------|----------------------|
| `none` | No | No one else (only me) |
| `restricted` | Restricted | Only other bean members (people with a `beans_share` row for this bean, `unsharedAt` IS NULL) |
| `anyone_with_link` | Anyone with the link | Other bean members + any authenticated user who has the bean share link |
| `public` | Public | Anyone (including unauthenticated on the public share page) |

**API behavior when returning shots to another user Carol:**
- **No** — Bob's shots are never shared; Carol never gets them.
- **Restricted** — Carol gets Bob's shots only if Carol has a `beans_share` row for that bean with `unsharedAt` IS NULL (i.e. Carol is a member).
- **Anyone with link** — Carol gets Bob's shots if Carol is authenticated (and has the link / is viewing the share page or bean detail).
- **Public** — Carol always gets Bob's shots (including unauthenticated on the public share page).

**Where this applies:**
- **Bean detail** (`GET /api/beans/:id/shots`): caller is always a bean member; members with `shotHistoryAccess` in `('restricted', 'anyone_with_link', 'public')` have their shots included. Only `none` is excluded.
- **Public share page** (`GET /api/shares/beans/:slug`): unauthenticated callers see only shots from members with `public`; authenticated callers see shots from `anyone_with_link` and `public`. `none` and `restricted` are never shown on the share page.

**Edge cases:**
- Owner's `shotHistoryAccess` — owner is also a member, so they control this independently.
- All members set `none` — on the bean detail page, each member sees only their own shots.
- All members set `restricted` — on the bean detail page, members still see each other's shots (restricted = visible to other members only).
- Member changes from `public` to `none` — their shots immediately disappear from other members' view and from public stats page.

---

## Flow 9: Duplicate bean

Available to any member (but especially useful for unshared/unfollowed users).

**Three shot handling options** (user chooses, default = duplicate):

| Option | Behavior |
|---|---|
| **Duplicate shots** (default) | Copies the user's own shots to the new bean. Originals remain on the original bean unchanged. |
| **Migrate shots** | Moves the user's own shots to the new bean (updates `beanId` on existing shot rows). Originals no longer appear under the original bean. |
| **No shots** | Creates the bean copy with no shots. |

Flow:
1. Click **Duplicate** on bean detail page
2. Choose shot handling option (default: duplicate)
3. Creates a new `beans` row owned by the current user
4. Handles shots per the selected option
5. Redirects to the new bean detail page

**Edge cases:**
- Only the user's own shots are affected — never other members' shots
- Duplicate a bean they still have active access to -- creates a fully independent copy, original access remains
- Migrate shots from an unshared bean -- shots move to the new bean, the user's shot count on the original bean drops to zero
- After migration, if the user edits a shot on the new bean, it doesn't affect anything on the original bean (the shot row was moved, not copied)

---

## Flow 10: Resharing (member invites another)

1. Member with `reshareAllowed = true` can invite others from the share dialog
2. Creates `beans_share` row with `invitedBy = member.userId`
3. If the member is later unshared, all their downstream invitees are recursively unshared too

**Edge cases:**
- Member's reshare permission revoked (`reshareAllowed` set to `false`) -- existing invitees stay, but member can't invite new ones
- Resharer invites someone who was previously unshared by the owner -- the existing row has `unsharedAt` set; re-invite clears `unsharedAt` and sets `status = 'accepted'` (the new inviter takes precedence)

---

## Bean editing permissions

Only the owner can edit bean metadata (name, origin, roaster, roast level, etc.). Enforced in **both** the UI (edit button only shown for owner) and the **PATCH API** (returns 403 if the caller is not the owner or admin).

---

## User account deletion

Users are **soft-deleted** (not hard-deleted). This preserves the `invitedBy` chain in `beans_share`, so recursive unsharing always works correctly. A soft-deleted user's shares remain intact but the user cannot log in or take actions.