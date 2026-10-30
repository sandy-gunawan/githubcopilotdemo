#!/usr/bin/env python3
"""
Quick log triage utility
────────────────────────
  • Accepts   *.log  or  *.log.gz
  • Filters   last N minutes (sliding window)
  • Tallies   (status‑code, endpoint) pairs
  • Optional  --status 499,321 for focused searching

  A noisy incident page reveals a spike in 321 or 499 errors, but the observability stack is lagging. You need a quick, local log sweep to spot patterns and counts.
"""

from pathlib import Path
from datetime import datetime, timedelta, timezone
import argparse
import gzip
import re
import sys
from collections import Counter
from typing import Iterable, Tuple

# ---------------------------------------------------------------------------
# ✨ Function placeholders – let Copilot write the bodies ✨
# ---------------------------------------------------------------------------


def read_lines(file_path: Path) -> Iterable[str]:
    """Open plain or gzipped log file and yield each line (stripped)."""
    if file_path.suffix == ".gz":
        with gzip.open(file_path, "rt", encoding="utf-8") as f:
            for line in f:
                yield line.strip()
    else:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                yield line.strip()


def parse_line(line: str) -> Tuple[datetime, int, str] | None:
    """Return (timestamp_utc, status_code_int, url_path) or None if malformed."""
    log_pattern = re.compile(
        r'\[(?P<timestamp>[^\]]+)\] "\w+ (?P<path>\S+) HTTP/[\d.]+" (?P<status>\d{3})'
    )
    m = log_pattern.search(line)
    if not m:
        return None
    try:
        timestamp_str = m.group("timestamp")
        timestamp = datetime.strptime(timestamp_str, "%d/%b/%Y:%H:%M:%S %z")
        timestamp_utc = timestamp.astimezone(timezone.utc)
        status = int(m.group("status"))
        path = m.group("path")
        return timestamp_utc, status, path
    except Exception:
        return None


def triage(
    lines: Iterable[str],
    minutes: int,
    wanted_status: set[int] | None
) -> Counter[Tuple[int, str]]:
    """Aggregate counts for lines within the window and matching status filter."""
    counter: Counter[Tuple[int, str]] = Counter()
    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    window_start = now - timedelta(minutes=minutes)
    for line in lines:
        parsed = parse_line(line)
        if not parsed:
            continue
        timestamp, status, path = parsed
        if timestamp < window_start:
            continue
        if wanted_status and status not in wanted_status:
            continue
        counter[(status, path)] += 1
    return counter


def render(counter: Counter[Tuple[int, str]], top: int) -> None:
    """Pretty‑print a Markdown‑style table of the top offenders."""
    print("| Rank | Status | Path | Hits |")
    print("|------|--------|------|------|")
    for i, ((status, path), hits) in enumerate(counter.most_common(top), start=1):
        print(f"| {i} | {status} | {path} | {hits} |")


def main() -> None:
    """Wire everything together with argparse CLI options."""
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--minutes", type=int, default=15)
    parser.add_argument("--status")
    parser.add_argument("--top", type=int, default=10)
    args = parser.parse_args()

    wanted_status = set(map(int, args.status.split(","))) if args.status else None
    lines = read_lines(args.file)
    counter = triage(lines, args.minutes, wanted_status)
    if not counter:
        exit(1)
    render(counter, args.top)


if __name__ == "__main__":
    main()

# ---------------------------------------------------------------------------
# 📝 Copilot prompts – copy these into each empty function or keep them here
# ---------------------------------------------------------------------------
# read_lines prompt:
#   "Implement read_lines(file_path) so it transparently handles .log or .log.gz,
#    opens in text mode (UTF‑8), and yields one stripped line at a time."

# parse_line prompt:
#   "Use a compiled regex for common/combined log format; pull timestamp,
#    status, and path. Convert the timestamp '[15/Jul/2025:14:23:41 +0000]'
#    to a timezone‑aware UTC datetime. Return None if the line doesn't match."

# triage prompt:
#   "Stream through lines, parse each; skip malformed. Keep only entries whose
#    timestamp is within <minutes> of datetime.utcnow() and, if wanted_status
#    is provided, whose status is in that set. Use a Counter keyed by
#    (status_code, path)."

# render prompt:
#   "Print the top <top> (status, path) pairs from the Counter in descending
#    order of hits, formatted as a Markdown table: Rank | Status | Path | Hits."

# main prompt:
#   "Add argparse arguments:
#       --file (positional, required)
#       --minutes (int, default 15)
#       --status  (comma‑separated list of ints, optional)
#       --top     (int, default 10)
#    Parse args, build wanted_status set, call triage(), then render().
#    Exit with status‑code 1 if no matches were found."
