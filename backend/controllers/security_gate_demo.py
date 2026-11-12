"""Sprint 4 security-gate demonstration fixture; never imported or executed."""

import yaml


def demo_only_never_called():
    """Feed a fixed harmless scalar to the intentionally unsafe loader."""
    return yaml.load("sprint4-demo-only", Loader=yaml.Loader)
