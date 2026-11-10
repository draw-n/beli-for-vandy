"""Fail Semgrep results at High/Critical severity without printing match text."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def classify(result: dict[str, Any]) -> str:
    metadata = result.get("extra", {}).get("metadata", {})
    score = metadata.get("security-severity")
    if score is not None:
        try:
            numeric_score = float(score)
        except (TypeError, ValueError):
            normalized = str(score).strip().lower()
            if normalized in {"critical", "high", "medium", "low", "info"}:
                return normalized.title()
            raise ValueError(f"unsupported security-severity value: {score!r}")
        if numeric_score >= 9:
            return "Critical"
        if numeric_score >= 7:
            return "High"
        if numeric_score >= 4:
            return "Medium"
        if numeric_score > 0:
            return "Low"
        return "Info"

    severity = str(result.get("extra", {}).get("severity", "")).upper()
    fallback = {"ERROR": "High", "WARNING": "Medium", "INFO": "Info"}
    if severity not in fallback:
        raise ValueError(f"unsupported Semgrep severity value: {severity!r}")
    return fallback[severity]


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: check_semgrep_results.py RESULTS.json", file=sys.stderr)
        return 2

    try:
        report = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
        if not isinstance(report, dict) or not isinstance(report.get("results"), list):
            raise ValueError("Semgrep JSON must contain a results array")
        errors = report.get("errors", [])
        if errors:
            print(f"Semgrep reported {len(errors)} scan error(s); failing closed.", file=sys.stderr)
            for error in errors:
                print(f"Scanner error: {error.get('message', 'unreported scanner error')}", file=sys.stderr)
            return 2

        counts: dict[str, int] = {}
        blocking = False
        for result in report["results"]:
            severity = classify(result)
            counts[severity] = counts.get(severity, 0) + 1
            if severity in {"High", "Critical"}:
                blocking = True
            path = result.get("path", "unknown path")
            line = result.get("start", {}).get("line", "?")
            rule_id = result.get("check_id", "unknown rule")
            print(f"{severity}: {rule_id} at {path}:{line}")

        if not report["results"]:
            print("Semgrep completed successfully: no findings.")
        else:
            summary = ", ".join(f"{name}={counts[name]}" for name in sorted(counts))
            print(f"Semgrep findings: {summary}")
        if blocking:
            print("High/Critical Semgrep finding(s) block the security gate.", file=sys.stderr)
            return 1
        return 0
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as error:
        print(f"Could not validate Semgrep results: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
