# Refactor Notes — Legacy Pricing Module

**Pair A:** Ashley  
**Pair B:** Sara  
**Navigator:** Helen

---

## Worksheet 1 — Understanding

| Question | Answer |
|---|---|
| What do t, q, u, d, c, w mean? | t is event type, q is quantity, u is user dictionary, d is day of the week, c is coupon code, and w is waitlist |
| In what order are discounts applied? Does the order matter? | Discounts are applied by user type (e.g., student, staff, alumni), then bulk discount, then coupon codes, then waitlist fee, then service fee. The order does matter because the user type discount multiplies the total, so it would give a different result if it came after the bulk discount. |
| Which code can never run? How do you know? | The FREEDRINK branch — it hits `pass` and does nothing, so no discount is ever applied. |
| What looks like a bug but is pinned by a test? | The FREEDRINK coupon doing nothing looks like a bug, but `test_freedrink_changes_nothing` pins that behavior. |

---

## Worksheet 2 — Refactoring Log

| # | Refactoring | AI or by hand? | Tests after | Kept or reverted? Why |
|---|---|---|---|---|
| 1 | Extract `_base_price(event_type, day)` — replace if/elif chain with two price dicts | AI | 24 pass | Kept — removes 10 lines of branching, CC drops |
| 2 | Extract `_validate_quantity(qty)` | AI | 24 pass | Kept — isolates validation, easier to test/change independently |
| 3 | Extract `_role_multiplier(user)` | AI | 24 pass | Kept — role logic is complex enough to deserve its own function |
| 4 | Extract `apply_bulk_discount` | AI | 24 pass | Kept — original behavior preserved |
| 5 | Extract `apply_coupon` | AI | 24 pass | Kept — original behavior preserved |
| 6 | Extract `calculate_fee` | AI | 24 pass | Kept — original behavior preserved |

---

## Worksheet 3 — Before and After (radon)

| Measure | Before | After |
|---|---|---|
| Highest function CC (grade) | calc: E (31) | calc: C (15) |
| Average CC | 31.0 | 7.0 |
| Number of functions | 1 | 4 |
| Maintainability index (radon mi) | A (53.94) | A (56.78) |
| Lines of code (radon raw: SLOC) | 63 | 64 |
| Tests passing | 24 / 24 | 24 / 24 |
