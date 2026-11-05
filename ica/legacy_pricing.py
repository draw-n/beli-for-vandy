"""Ticket pricing for CampusEvents -- legacy module (ICA 24A).

This works, and it is tested (see test_legacy_pricing.py), but nobody wants to touch it.
Your job: refactor it without changing behavior, and measure the result with radon.
"""

_WEEKDAY_PRICES = {
    "concert": 20.0,
    "lecture": 5.0,
    "sports": 12.0,
    "workshop": 30.0,
}

_WEEKEND_PRICES = {
    "concert": 25.0,
    "lecture": 5.0,
    "sports": 15.0,
    "workshop": 30.0,
}


def _base_price(event_type, day):
    prices = _WEEKEND_PRICES if day in (5, 6) else _WEEKDAY_PRICES
    if event_type not in prices:
        raise ValueError("bad type")
    return prices[event_type]


def _validate_quantity(qty):
    if qty <= 0:
        raise ValueError("bad qty")
    if qty > 10:
        raise ValueError("too many")


def _role_multiplier(user):
    if user is None:
        return 1.0
    role = user.get("role")
    if role == "student":
        return 0.8 if user.get("verified") else 0.9
    if role == "staff":
        return 0.85
    if role == "alumni":
        return 0.85 if user.get("years", 0) >= 10 else 0.95
    return 1.0


def calc(t, q, u, d, c=None, w=False):
    # t = event type, q = quantity, u = user dict, d = day of week (0=Mon..6=Sun),
    # c = coupon code, w = waitlist
    p = _base_price(t, d)
    _validate_quantity(q)
    total = p * q * _role_multiplier(u)

    if q >= 5:
        if t != "workshop":
            total = total - 5.0
    if c is not None:
        if c == "WELCOME10":
            if u is not None and u.get("first_purchase"):
                total = total * 0.9
        elif c == "HALFOFF":
            if t == "lecture":
                total = total * 0.5
        elif c == "FREEDRINK":
            pass
        else:
            raise ValueError("bad coupon")
    if w:
        total = total + 2.0
    if total < 0:
        total = 0.0
    fee = 0.0
    if total > 0:
        if total < 20:
            fee = 1.0
        elif total < 100:
            fee = 2.5
        else:
            fee = 5.0
    return round(total + fee, 2)