# Blip Full-Stack Health Audit Report

## Audit Scope
All backend route files (8), middleware (2), db client, entry point, frontend API client, AppContext state manager, App.jsx, main.jsx, and key screens.

---

## 🔴 Critical Issues

### 1. [getUserId()](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/middleware/auth.js#4-8) likely crashes — `req.auth()` vs `req.auth`
**File:** [auth.js](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/middleware/auth.js#L4-L7)

```js
export const getUserId = (req) => {
    const auth = req.auth();   // ⬅ called as a function
    return auth.userId || auth.sub;
};
```

With `@clerk/express` v2+, `req.auth` is a **property** (object), not a function. Calling `req.auth()` will throw `TypeError: req.auth is not a function` on every authenticated request. Since this is used in **every single route**, this would break the entire API.

> [!CAUTION]
> If the server is currently running without errors, it's possible you're on an older Clerk version where `req.auth()` works. But per the v2 spec, this should be `req.auth` (no parentheses). **Verify which version is actually installed.**

---

### 2. Transaction safety: [query('BEGIN')](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/db/client.js#24-25) without dedicated client
**File:** [friends.js](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/routes/friends.js) — Lines 178, 488, 605, 737, 840

Multiple endpoints call `await query('BEGIN')` then `await query('COMMIT')` or `await query('ROLLBACK')`, but [query()](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/db/client.js#24-25) uses `pool.query()` which grabs a **random client from the pool** for each call. The `BEGIN`, `INSERT`, and `COMMIT` may all execute on **different connections**, meaning:
- **Transactions are NOT actually atomic**
- Rollbacks won't actually rollback anything

Compare to [recurring.js](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/routes/recurring.js#L70-L117) and [income.js](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/routes/income.js#L9-L62) which correctly use `pool.connect()` to get a dedicated client.

**Affected routes:**
| Route | Line |
|---|---|
| `POST /groups` | 178 |
| [saveExpense()](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/routes/friends.js#471-541) (POST friend/group expenses, PATCH social-expenses) | 488 |
| `DELETE /social-payments/:id` | 605 |
| `POST /friends/:friendId/settle` | 737 |
| `POST /groups/:id/settle` | 840 |

---

## 🟡 Medium Issues

### 3. Dead code in [settleFriend()](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/store/AppContext.jsx#776-788) — balance recalculation is unused
**File:** [AppContext.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/store/AppContext.jsx#L776-L787)

```js
const settleFriend = async (friendId, amount, name) => {
    triggerFlow('income', amount);
    try {
        await api.settleFriend(friendId, amount);
        const f = friends.find(f => f.id === friendId);
        if (f) {
            const bal = parseFloat(f.balance || 0);
            const newBal = bal > 0 ? bal - amount : bal + amount;
            // ⬅ newBal is computed but NEVER used
        }
        await refreshSocial();
    } ...
```

The `newBal` variable is calculated but never assigned anywhere. The friend list is just refreshed via `refreshSocial()`, making this code dead.

---

### 4. `paidToName` comparison uses wrong type in [getExpenses()](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/routes/friends.js#361-451)
**File:** [friends.js](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/routes/friends.js#L434-L446)

```js
paidToName: e.paid_to_name === userId ? 'You' : (e.paid_to_name || null),
// ...
yourShare: e.type === 'payment'
    ? (e.paid_by === userId ? -parseFloat(e.amount) : (e.paid_to_name === userId ? parseFloat(e.amount) : 0))
```

`e.paid_to_name` is a **name string** (e.g., "Shashank"), while `userId` is a **Clerk user ID** (e.g., "user_abc123"). This comparison `e.paid_to_name === userId` will **always be false**, so:
- The `paidToName` will never show "You" for the current user
- The `yourShare` for received payments will always be `0`

---

### 5. `sslmode` option is invalid in `pg` client config
**File:** [client.js](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/db/client.js#L12-L18)

```js
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
        sslmode: 'verify-full'  // ⬅ Not a valid pg Pool option
    }
});
```

`sslmode` is a **libpq/connection-string** parameter, not a Node.js `pg` SSL config option. It's being silently ignored. The actual SSL behavior is controlled by `rejectUnauthorized: false`, which contradicts `verify-full`. This is a no-op but misleading.

---

### 6. Express v5 compatibility concerns
**File:** [package.json](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/package.json#L17)

The backend uses `"express": "^5.2.1"`. Express 5 has several breaking changes from v4:
- `req.query` returns a getter-only object
- `res.status()` chainability changes
- Route parameters parsing differences

Your routes generally look v5-compatible, but it's worth noting that some Clerk middleware or other packages might not be fully compatible with Express 5 yet.

---

## 🟢 Minor Issues / Observations

### 7. [Recurring](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/store/AppContext.jsx#480-504) screen ([Recurring.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/screens/Recurring.jsx)) is defined but never used directly
The [Recurring.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/screens/Recurring.jsx) screen exists (9KB) but is not imported in [App.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/App.jsx). Recurring payments are shown within [Home.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/screens/Home.jsx) instead. This file appears to be unused dead code.

### 8. [handleRefresh](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/store/AppContext.jsx#909-920) references `activeFriendContext.details?.id` but `details` is never set
**File:** [AppContext.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/store/AppContext.jsx#L912)

```js
if (activeFriendContext.details?.id) {
    await syncFriendDetail(activeFriendContext.details.id);
}
```

The initial state sets `details: null` and nowhere in the code is `details` ever populated. It's always `null`, so this refresh check never fires.

### 9. `checkVersionOnLoad` is defined but never called
**File:** [AppContext.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/store/AppContext.jsx#L131-L137)

The `checkVersionOnLoad` callback is defined but is never invoked anywhere. The version check logic is instead done inline in `bootstrapData()` at line 237. This is dead code.

### 10. Duplicate [parseExpenseInput](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/store/AppContext.jsx#326-336) function
The NLP expense parser is duplicated:
- [AppContext.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/store/AppContext.jsx#L327-L335)
- [Home.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/screens/Home.jsx#L13-L21)
- [Friends.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/screens/Friends.jsx#L164-L172) (as [parseInput](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/screens/Friends.jsx#164-173))

Not a bug, but a maintenance risk.

### 11. [updateOnboardingStatus](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/lib/api.js#63-64) sends no body, but backend doesn't need one
**File:** [api.js](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/lib/api.js#L63)

```js
updateOnboardingStatus: () => request('/users/me/onboarding', { method: 'PATCH' }),
```

This is fine because the backend route hardcodes `is_onboarded = TRUE`. But in [completeOnboarding](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/store/AppContext.jsx#450-479), it's called as `api.updateOnboardingStatus(true)` — the `true` argument is silently ignored.

### 12. [Recurring.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/screens/Recurring.jsx) screen never rendered in the navigation
**File:** [App.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/App.jsx#L764-L770)

There's no `{currentScreen === 'recurring' && <Recurring />}` in the rendering logic, and [Recurring](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/store/AppContext.jsx#480-504) is never imported in [App.jsx](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/App.jsx). The scheduled payments are embedded in the Home screen.

---

## ✅ What's Working Well

| Area | Status |
|---|---|
| **API route paths match frontend calls** | ✅ All [api.js](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-web/src/lib/api.js) methods map correctly to backend routes |
| **Auth middleware applied** | ✅ `router.use(requireAuth)` on all route files |
| **CORS configured** | ✅ Origin set via env variable |
| **Error handling** | ✅ Global [errorHandler](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/middleware/errorHandler.js#1-13) middleware catches unhandled errors |
| **Foreign key protection** | ✅ `ON CONFLICT DO NOTHING` on friendships, `23503` catch on recurring logs |
| **Optimistic UI** | ✅ Consistent pattern of optimistic updates + rollbacks |
| **Toast/animation feedback** | ✅ Consistent across all CRUD operations |
| **SQL injection protection** | ✅ All queries use parameterized queries |
| **Shopping CRUD** | ✅ Full loop connected and working |
| **Investment CRUD** | ✅ Full loop connected and working |
| **Expense CRUD** | ✅ Full loop connected and working |
| **Dashboard summary** | ✅ Correctly aggregates monthly data |
| **Income flow** | ✅ Uses proper transaction with `pool.connect()` |
| **Recurring payment flow** | ✅ Uses proper transaction with `pool.connect()` |
| **Friends list balance calc** | ✅ Complex SQL correctly calculates bidirectional debts |
| **Group balance calc** | ✅ Pairwise debt calculation looks correct |
| **Settlement itemization** | ✅ Oldest-first split settlement logic is sound |

---

## Summary

| Severity | Count |
|---|---|
| 🔴 Critical | 2 |
| 🟡 Medium | 4 |
| 🟢 Minor | 6 |

**The two critical issues are:**
1. **`req.auth()` vs `req.auth`** — potential crash on every API call (depends on Clerk version)
2. **[query('BEGIN')](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/db/client.js#24-25) without dedicated pool client** — transactions in [friends.js](file:///Users/shashankmodi/Documents/VS%20Code/Projects/Blip/blip-api/routes/friends.js) are not actually atomic

The frontend API client paths all match the backend correctly, and the app structure is sound overall. The main risks are in the transaction safety of the social features.
