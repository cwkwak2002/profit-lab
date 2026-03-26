"""QA 팀 테스트 설정 (QA Test Configuration)

이 파일은 test_plan/ 에서 pytest를 실행할 때만 로드됩니다.
역할:
  1. backend/ 소스 경로를 sys.path에 추가 (개발자 테스트 픽스처 사용 가능)
  2. 테스트 결과 보고서 생성 훅 (MD + HTML + CSV → test_plan/results/)
  3. 개발자 픽스처 재-export (backend/tests/conftest.py 의 픽스처 위임)

개발자 테스트(backend/tests/conftest.py)와 완전히 분리됩니다:
  - 개발자가 backend/ 에서 pytest 실행 → 보고서 훅 없음, backend/test-results/ 없음
  - QA가 test_plan/ 에서 pytest 실행 → 보고서 test_plan/results/ 에 생성
"""
import csv
import sys
import sqlite3
import textwrap
from datetime import datetime
from pathlib import Path

import pytest

# ── 경로 설정 ──────────────────────────────────────────────────────────────────
_REPO_ROOT   = Path(__file__).parent.parent          # profit-lab/
_BACKEND_DIR = _REPO_ROOT / "backend"
_TESTS_DIR   = _BACKEND_DIR / "tests"

# backend 소스 및 테스트 헬퍼를 import 가능하게 설정
sys.path.insert(0, str(_BACKEND_DIR))
sys.path.insert(0, str(_TESTS_DIR))


# ── QA 결과 보고 훅 ────────────────────────────────────────────────────────────

_RESULTS: list[dict] = []
_SESSION_START: datetime | None = None


def pytest_sessionstart(session):
    global _SESSION_START
    _SESSION_START = datetime.now()
    _RESULTS.clear()


def pytest_runtest_logreport(report):
    """각 TC의 PASS/FAIL/SKIP 결과를 수집."""
    if report.when != "call" and not (report.when == "setup" and report.skipped):
        return

    nodeid = report.nodeid
    parts  = nodeid.split("::")
    # nodeid 에서 경로 앞부분 정리 (../backend/tests/test_foo.py → test_foo.py)
    raw_file = parts[0].replace("\\", "/")
    file = Path(raw_file).name  # 파일명만 추출
    cls  = parts[1] if len(parts) >= 3 else ""
    name = parts[-1]

    if report.passed:
        status = "PASS"
    elif report.skipped:
        status = "SKIP"
    else:
        status = "FAIL"

    message = ""
    if report.failed and hasattr(report, "longrepr"):
        raw = str(report.longrepr)
        for line in reversed(raw.splitlines()):
            stripped = line.strip()
            if stripped.startswith("E ") or stripped.startswith("AssertionError"):
                message = stripped.lstrip("E").strip()
                break
        if not message:
            message = raw.splitlines()[-1].strip()[:120]

    _RESULTS.append({
        "file":    file,
        "class":   cls,
        "name":    name,
        "status":  status,
        "message": message,
    })


def pytest_sessionfinish(session, exitstatus):
    """세션 종료 시 MD + HTML + CSV 보고서를 test_plan/results/ 에 저장."""
    if not _RESULTS:
        return

    now      = _SESSION_START or datetime.now()
    end_time = datetime.now()
    elapsed  = (end_time - now).total_seconds()

    passed  = sum(1 for r in _RESULTS if r["status"] == "PASS")
    failed  = sum(1 for r in _RESULTS if r["status"] == "FAIL")
    skipped = sum(1 for r in _RESULTS if r["status"] == "SKIP")
    total   = len(_RESULTS)
    overall = "✅ PASSED" if failed == 0 else "❌ FAILED"

    ts      = now.strftime("%Y%m%d_%H%M%S")

    # 앱 버전 읽기 (test_plan/APP_VERSION 파일)
    _app_version = "0.1.0"
    _version_file = Path(__file__).parent / "APP_VERSION"
    try:
        if _version_file.exists():
            _app_version = _version_file.read_text(encoding="utf-8").strip()
    except Exception:
        pass

    # 버전/타임스탬프 폴더 구조: results/test-runs/v{version}/{YYYYMMDD_HHMMSS}/
    out_dir = Path(__file__).parent / "results" / "test-runs" / f"v{_app_version}" / ts
    out_dir.mkdir(parents=True, exist_ok=True)

    file_stats: dict[str, dict] = {}
    for r in _RESULTS:
        f = r["file"]
        if f not in file_stats:
            file_stats[f] = {"PASS": 0, "FAIL": 0, "SKIP": 0}
        file_stats[f][r["status"]] += 1

    failures = [r for r in _RESULTS if r["status"] == "FAIL"]

    md_path   = out_dir / "TEST_RESULT.md"
    html_path = out_dir / "TEST_RESULT.html"
    csv_path  = out_dir / "TEST_RESULT.csv"

    _write_markdown(md_path, now, elapsed, passed, failed, skipped, total,
                    overall, file_stats, failures, _RESULTS)
    _write_html(html_path, now, elapsed, passed, failed, skipped, total,
                overall, file_stats, failures, _RESULTS)
    _write_csv(csv_path, now, _RESULTS)

    _test_plan_dir = Path(__file__).parent
    print(f"\n📄 QA 보고서 저장됨 (results/test-runs/v{_app_version}/{ts}/):")
    print(f"   MD  : {md_path.relative_to(_test_plan_dir)}")
    print(f"   HTML: {html_path.relative_to(_test_plan_dir)}")
    print(f"   CSV : {csv_path.relative_to(_test_plan_dir)}")


# ── 보고서 작성 함수 ──────────────────────────────────────────────────────────

def _write_markdown(path, now, elapsed, passed, failed, skipped, total,
                    overall, file_stats, failures, results):
    lines = [
        "# Profit-Lab QA 테스트 결과 보고서",
        "",
        "| 항목 | 값 |",
        "|------|----|",
        f"| **실행 일시** | {now.strftime('%Y-%m-%d %H:%M:%S')} |",
        f"| **소요 시간** | {elapsed:.2f}s |",
        f"| **실행 주체** | QA 팀 (test_plan/) |",
        f"| **최종 결과** | {overall} |",
        "",
        "## 결과 요약",
        "",
        "| 결과 | 건수 |",
        "|------|------|",
        f"| ✅ Passed  | {passed} |",
        f"| ❌ Failed  | {failed} |",
        f"| ⏭️ Skipped | {skipped} |",
        f"| **Total**  | **{total}** |",
        "",
        "## 파일별 결과",
        "",
        "| 파일 | ✅ | ❌ | ⏭️ |",
        "|------|----|----|-----|",
    ]
    for f, s in sorted(file_stats.items()):
        lines.append(f"| `{f}` | {s['PASS']} | {s['FAIL']} | {s['SKIP']} |")

    lines += ["", "## 전체 TC 목록", "",
              "| # | 파일 | 클래스 | 테스트명 | 결과 | 비고 |",
              "|---|------|--------|---------|------|------|"]
    for i, r in enumerate(results, 1):
        icon = {"PASS": "✅", "FAIL": "❌", "SKIP": "⏭️"}.get(r["status"], "?")
        msg  = r["message"].replace("|", "\\|") if r["message"] else ""
        lines.append(
            f"| {i} | `{r['file']}` | `{r['class']}` | `{r['name']}` | {icon} | {msg} |"
        )

    if failures:
        lines += ["", "## 실패 상세", ""]
        for r in failures:
            lines += [
                f"### ❌ `{r['file']}::{r['class']}::{r['name']}`",
                "```",
                r["message"] or "(메시지 없음)",
                "```",
                "",
            ]

    path.write_text("\n".join(lines), encoding="utf-8")


def _write_html(path, now, elapsed, passed, failed, skipped, total,
                overall, file_stats, failures, results):
    status_color = "#22c55e" if failed == 0 else "#ef4444"

    rows_summary = ""
    for f, s in sorted(file_stats.items()):
        rows_summary += (
            f"<tr><td><code>{f}</code></td>"
            f"<td class='pass'>{s['PASS']}</td>"
            f"<td class='fail'>{s['FAIL']}</td>"
            f"<td class='skip'>{s['SKIP']}</td></tr>\n"
        )

    rows_all = ""
    for i, r in enumerate(results, 1):
        cls_map = {"PASS": "pass", "FAIL": "fail", "SKIP": "skip"}
        icon    = {"PASS": "✅", "FAIL": "❌", "SKIP": "⏭️"}.get(r["status"], "?")
        row_cls = cls_map.get(r["status"], "")
        msg     = r["message"].replace("<", "&lt;").replace(">", "&gt;") if r["message"] else ""
        rows_all += (
            f"<tr class='{row_cls}'>"
            f"<td>{i}</td>"
            f"<td><code>{r['file']}</code></td>"
            f"<td><code>{r['class']}</code></td>"
            f"<td><code>{r['name']}</code></td>"
            f"<td>{icon}</td>"
            f"<td class='msg'>{msg}</td>"
            f"</tr>\n"
        )

    fail_section = ""
    if failures:
        fail_section = "<h2>실패 상세</h2>"
        for r in failures:
            msg = (r["message"] or "(메시지 없음)").replace("<", "&lt;").replace(">", "&gt;")
            fail_section += (
                f"<div class='fail-block'>"
                f"<strong>❌ {r['file']}::{r['class']}::{r['name']}</strong>"
                f"<pre>{msg}</pre></div>"
            )

    html = textwrap.dedent(f"""\
    <!DOCTYPE html>
    <html lang="ko">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[QA] Profit-Lab 테스트 결과 — {now.strftime('%Y-%m-%d %H:%M:%S')}</title>
    <style>
      body {{ font-family: 'Segoe UI', sans-serif; background:#f8fafc; color:#1e293b; margin:0; padding:24px; }}
      h1   {{ font-size:1.6rem; border-bottom:3px solid #7c3aed; padding-bottom:8px; }}
      h2   {{ font-size:1.1rem; margin-top:2rem; color:#334155; }}
      .qa-tag {{ display:inline-block; padding:3px 10px; border-radius:4px; font-size:.75rem;
                 font-weight:700; color:#fff; background:#7c3aed; margin-left:12px;
                 vertical-align:middle; }}
      .badge {{ display:inline-block; padding:6px 16px; border-radius:6px; font-weight:700;
                font-size:1rem; color:#fff; background:{status_color}; margin-bottom:16px; }}
      .meta  {{ display:flex; gap:32px; flex-wrap:wrap; margin-bottom:24px; }}
      .meta span {{ font-size:.9rem; color:#64748b; }}
      .meta strong {{ color:#1e293b; }}
      .summary-grid {{ display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap; }}
      .stat-card {{ background:#fff; border:1px solid #e2e8f0; border-radius:8px;
                    padding:16px 24px; min-width:110px; text-align:center;
                    box-shadow:0 1px 3px rgba(0,0,0,.06); }}
      .stat-card .num {{ font-size:2rem; font-weight:700; line-height:1; }}
      .stat-card .lbl {{ font-size:.75rem; color:#94a3b8; margin-top:4px; }}
      .pass .num {{ color:#22c55e; }}
      .fail .num {{ color:#ef4444; }}
      .skip .num {{ color:#f59e0b; }}
      table  {{ width:100%; border-collapse:collapse; font-size:.85rem; background:#fff;
                border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.06); }}
      th     {{ background:#1e293b; color:#f1f5f9; padding:10px 12px; text-align:left; font-weight:600; }}
      td     {{ padding:8px 12px; border-bottom:1px solid #f1f5f9; }}
      tr.pass td:nth-child(5) {{ color:#22c55e; font-weight:600; }}
      tr.fail {{ background:#fff5f5; }}
      tr.fail td:nth-child(5) {{ color:#ef4444; font-weight:600; }}
      tr.skip {{ background:#fffbeb; }}
      tr.skip td:nth-child(5) {{ color:#f59e0b; font-weight:600; }}
      tr:hover {{ background:#f8fafc; }}
      .msg   {{ font-size:.78rem; color:#64748b; max-width:320px; word-break:break-all; }}
      code   {{ background:#f1f5f9; padding:1px 5px; border-radius:3px; font-size:.82rem; }}
      .fail-block {{ background:#fff5f5; border-left:4px solid #ef4444;
                     padding:12px 16px; margin:8px 0; border-radius:0 6px 6px 0; }}
      .fail-block pre {{ margin:8px 0 0; font-size:.82rem; color:#7f1d1d; white-space:pre-wrap; }}
      .export-note {{ margin-top:32px; padding:16px; background:#f5f3ff; border-radius:8px;
                      border:1px solid #ddd6fe; font-size:.85rem; color:#4c1d95; }}
      @media print {{ body {{ padding:8px; }} }}
    </style>
    </head>
    <body>
    <h1>Profit-Lab 테스트 결과 보고서 <span class="qa-tag">QA</span></h1>
    <div class="badge">{overall}</div>
    <div class="meta">
      <span><strong>실행 일시</strong>: {now.strftime('%Y-%m-%d %H:%M:%S')}</span>
      <span><strong>소요 시간</strong>: {elapsed:.2f}s</span>
      <span><strong>총 TC</strong>: {total}</span>
      <span><strong>실행 주체</strong>: QA 팀</span>
    </div>

    <div class="summary-grid">
      <div class="stat-card pass"><div class="num">{passed}</div><div class="lbl">PASSED</div></div>
      <div class="stat-card fail"><div class="num">{failed}</div><div class="lbl">FAILED</div></div>
      <div class="stat-card skip"><div class="num">{skipped}</div><div class="lbl">SKIPPED</div></div>
    </div>

    <h2>파일별 결과</h2>
    <table>
      <thead><tr><th>파일</th><th>✅ Pass</th><th>❌ Fail</th><th>⏭️ Skip</th></tr></thead>
      <tbody>{rows_summary}</tbody>
    </table>

    <h2>전체 TC 목록</h2>
    <table>
      <thead><tr><th>#</th><th>파일</th><th>클래스</th><th>테스트명</th><th>결과</th><th>비고</th></tr></thead>
      <tbody>{rows_all}</tbody>
    </table>

    {fail_section}

    <div class="export-note">
      💡 <strong>스프레드시트 내보내기</strong>: 동일 타임스탬프의 <code>.csv</code> 파일을
      Google Sheets 또는 Excel에서 열거나 가져오기(Import)하면 됩니다.
    </div>
    </body>
    </html>
    """)
    path.write_text(html, encoding="utf-8")


def _write_csv(path, now, results):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["실행일시", "파일", "클래스", "테스트명", "결과", "비고"])
        ts = now.strftime("%Y-%m-%d %H:%M:%S")
        for r in results:
            writer.writerow([ts, r["file"], r["class"], r["name"], r["status"], r["message"]])


# ── 개발자 픽스처 위임 ─────────────────────────────────────────────────────────
# backend/tests/conftest.py 의 픽스처를 QA 테스트에서도 사용할 수 있도록 재-export

_BENCHMARK_SCHEMA = """
    CREATE TABLE IF NOT EXISTS benchmark_models (
        id       TEXT PRIMARY KEY,
        name     TEXT NOT NULL UNIQUE,
        seed     REAL NOT NULL DEFAULT 100.0,
        leverage INTEGER NOT NULL DEFAULT 10,
        created_at TEXT NOT NULL,
        balance  REAL NOT NULL DEFAULT 100.0
    );
    CREATE TABLE IF NOT EXISTS benchmark_batches (
        id             TEXT PRIMARY KEY,
        model_id       TEXT NOT NULL,
        market_analysis TEXT DEFAULT '',
        created_at     TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS benchmark_orders (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        model_id     TEXT NOT NULL,
        batch_id     TEXT NOT NULL,
        symbol       TEXT NOT NULL,
        side         TEXT NOT NULL,
        entry_price  REAL NOT NULL,
        tp_price     REAL NOT NULL,
        sl_price     REAL NOT NULL,
        description  TEXT DEFAULT '',
        margin       REAL NOT NULL,
        status       TEXT NOT NULL DEFAULT 'PENDING',
        created_at   TEXT NOT NULL,
        fill_time    TEXT,
        close_time   TEXT,
        close_price  REAL,
        close_reason TEXT,
        pnl          REAL,
        pnl_pct      REAL,
        balance_after REAL,
        order_type   TEXT NOT NULL DEFAULT 'limit',
        confidence   INTEGER NOT NULL DEFAULT 3,
        tp2_price    REAL,
        tp1_hit      INTEGER NOT NULL DEFAULT 0,
        tp1_pnl      REAL,
        source       TEXT NOT NULL DEFAULT 'manual'
    );
"""


@pytest.fixture
def in_memory_db():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS candles (
            symbol TEXT NOT NULL,
            timeframe TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume REAL NOT NULL,
            PRIMARY KEY (symbol, timeframe, timestamp)
        );
        CREATE TABLE IF NOT EXISTS backtest_runs (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            coins TEXT NOT NULL,
            params TEXT
        );
        CREATE TABLE IF NOT EXISTS backtest_coin_summary (
            run_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            total_trades INTEGER NOT NULL DEFAULT 0,
            win_rate REAL NOT NULL DEFAULT 0,
            cumulative_return REAL NOT NULL DEFAULT 0,
            max_drawdown REAL NOT NULL DEFAULT 0,
            final_balance REAL NOT NULL DEFAULT 0,
            PRIMARY KEY (run_id, symbol)
        );
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            side TEXT NOT NULL DEFAULT 'long',
            entry_time TEXT NOT NULL,
            entry_price REAL NOT NULL,
            entry_margin REAL NOT NULL,
            exit_time TEXT NOT NULL,
            exit_price REAL NOT NULL,
            exit_reason TEXT NOT NULL,
            pnl REAL NOT NULL,
            pnl_pct REAL NOT NULL,
            balance_after REAL NOT NULL,
            tp1_time TEXT
        );
    """)
    yield conn
    conn.close()


@pytest.fixture
def benchmark_db():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(_BENCHMARK_SCHEMA)
    yield conn
    conn.close()


@pytest.fixture
def in_memory_db_with_benchmark(in_memory_db):
    in_memory_db.executescript(_BENCHMARK_SCHEMA)
    return in_memory_db
