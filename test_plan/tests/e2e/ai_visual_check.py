"""Stage 2 — AI Visual Check (Claude Vision 기반 UI/UX 품질 분석)

스크린샷을 캡처한 뒤 Claude API로 디자인 품질을 분석합니다.
이 파일은 test_plan/ 에서 독립적으로 관리됩니다 (backend/ 와 무관).

사전 조건:
  - 백엔드(8000) + 프론트엔드(3001) 실행 중
  - ANTHROPIC_API_KEY 환경변수 설정
  - pip install anthropic playwright

실행 — test_plan/ 폴더에서:
  python tests/e2e/ai_visual_check.py
  python tests/e2e/ai_visual_check.py --pages home backtest
  python tests/e2e/ai_visual_check.py --save-only   # 스크린샷만 저장 (API 호출 없음)

출력 (버전/타임스탬프별 폴더):
  results/screenshots/v{version}/{YYYYMMDD_HHMMSS}/
    ├── home.png
    ├── backtest.png
    ├── benchmark.png
    ├── leaderboard.png
    └── visual_report.md
"""

import argparse
import base64
import os
import re
import sys
from datetime import datetime
from pathlib import Path

# ── 설정 ──────────────────────────────────────────────────────────────────────

BASE_URL = "http://localhost:3001"

# test_plan/ 기준 경로 (backend/ 참조 없음)
_TEST_PLAN_DIR = Path(__file__).resolve().parent.parent.parent  # test_plan/

# 앱 버전: test_plan/APP_VERSION 파일 우선, 없으면 기본값
_APP_VERSION = "0.1.0"
_version_file = _TEST_PLAN_DIR / "APP_VERSION"
if _version_file.exists():
    _APP_VERSION = _version_file.read_text(encoding="utf-8").strip()

# 실행마다 고유한 타임스탬프 폴더
_RUN_TS = datetime.now().strftime("%Y%m%d_%H%M%S")
SCREENSHOT_DIR = _TEST_PLAN_DIR / "results" / "screenshots" / f"v{_APP_VERSION}" / _RUN_TS
REPORT_PATH    = SCREENSHOT_DIR / "visual_report.md"

PAGES = {
    "home":        f"{BASE_URL}/",
    "backtest":    f"{BASE_URL}/backtest",
    "benchmark":   f"{BASE_URL}/benchmark",
    "leaderboard": f"{BASE_URL}/benchmark/models",
}

# 각 페이지별 AI 분석 체크포인트
CHECKLISTS = {
    "home": [
        "히어로 섹션(TRADE SMARTER 텍스트)이 잘 보이는가?",
        "3개의 기능 카드(BACKTEST ENGINE, AI INTELLIGENCE, LEADERBOARD)가 균형있게 배치되었는가?",
        "CTA 버튼(RUN_BENCHMARK.EXE, LEADERBOARD)이 눈에 잘 띄는가?",
        "전체적인 픽셀/레트로 디자인 테마가 일관성 있게 적용되었는가?",
        "텍스트가 배경과 충분한 대비를 이루는가?",
    ],
    "backtest": [
        "전략 선택 버튼(RSI DIV, EMA TREND, BB SQUEEZE)이 명확하게 표시되는가?",
        "날짜 입력 필드가 레이블과 함께 잘 정렬되어 있는가?",
        "코인 선택 그리드가 읽기 쉽게 배치되었는가?",
        "'백테스트 실행' 버튼이 충분히 눈에 띄는가?",
        "페이지 레이아웃에 텍스트 잘림이나 겹침이 없는가?",
    ],
    "benchmark": [
        "모델명 입력 필드와 레이블이 명확한가?",
        "AVAILABLE_BALANCE 표시가 잘 보이는가?",
        "주문 카드(ORDER 01)의 필드(코인·SIDE·진입가·TP·SL)가 정돈되어 있는가?",
        "+추가 및 전체삭제 버튼이 구분되게 표시되는가?",
        "'▶ 주문 제출' 버튼이 액션 버튼으로 충분히 강조되어 있는가?",
    ],
    "leaderboard": [
        "리더보드 페이지가 빈 화면 없이 렌더링되는가?",
        "모델이 없을 경우 빈 상태 메시지가 친절하게 표시되는가?",
        "모델이 있을 경우 순위 테이블이 읽기 쉽게 정렬되어 있는가?",
        "네비게이션 버튼이 명확하게 표시되는가?",
    ],
}

DESIGN_SYSTEM_CONTEXT = """
Profit-Lab의 디자인 시스템:
- 테마: 픽셀/레트로 사이버펑크 (어두운 배경, 네온 색상)
- 주요 색상: 배경 #05051e (진한 남색), 강조 #3355ff (파랑), #00eeff (시안), #ff2d78 (핑크), #ffe000 (노랑), #00ff7f (초록), #ff3333 (빨강)
- 폰트: 'Press Start 2P' (픽셀), 'JetBrains Mono' (모노), Pretendard (본문)
- 레이아웃: border-radius 0px (각진 모서리), 굵은 테두리, 스캔라인 오버레이
- 버튼: 단색 배경 또는 테두리만 있는 픽셀 스타일
"""


# ── 스크린샷 캡처 ─────────────────────────────────────────────────────────────

def capture_screenshots(pages: list[str]) -> dict[str, Path]:
    """지정된 페이지의 스크린샷을 캡처합니다."""
    from playwright.sync_api import sync_playwright

    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    captured = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        for name in pages:
            url = PAGES.get(name)
            if not url:
                print(f"[SKIP] 알 수 없는 페이지: {name}")
                continue

            print(f"[CAPTURE] {name} ({url})")
            try:
                # 모든 페이지 load 사용 (ticker WebSocket 등으로 networkidle 미도달)
                wait_until = "load"
                timeout = 15000
                page.goto(url, wait_until=wait_until, timeout=timeout)
                page.wait_for_timeout(1000)  # 애니메이션 안정화 대기

                path = SCREENSHOT_DIR / f"{name}.png"
                page.screenshot(path=str(path), full_page=True)
                captured[name] = path
                print(f"  → 저장됨: {path.name}")
            except Exception as e:
                print(f"  [ERROR] 캡처 실패: {e}")

        context.close()
        browser.close()

    return captured


# ── Claude Vision 분석 ────────────────────────────────────────────────────────

def analyze_with_claude(name: str, image_path: Path) -> dict:
    """Claude API로 스크린샷을 분석합니다."""
    try:
        import anthropic
    except ImportError:
        print("[ERROR] anthropic 패키지가 설치되지 않았습니다: pip install anthropic")
        sys.exit(1)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("[ERROR] ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    checklist = CHECKLISTS.get(name, [])
    checklist_text = "\n".join(f"{i+1}. {item}" for i, item in enumerate(checklist))

    prompt = f"""당신은 UI/UX 전문가입니다. 아래 스크린샷을 분석해주세요.

{DESIGN_SYSTEM_CONTEXT}

분석 대상 페이지: **{name}**

다음 체크리스트 항목을 검토하고 각 항목에 대해 ✅ PASS / ⚠️ WARN / ❌ FAIL 로 평가하세요:

{checklist_text}

추가로 다음도 확인하세요:
- 텍스트 잘림 또는 겹침 여부
- 레이아웃 깨짐 여부
- 빈 상태(empty state) 처리 적절성
- 전체적인 디자인 시스템 일관성

응답 형식:
1. 체크리스트 평가 (각 항목: ✅/⚠️/❌ + 한 줄 설명)
2. 발견된 문제점 (없으면 "없음")
3. 전체 점수 (100점 만점)
4. 한 줄 요약
"""

    print(f"  [CLAUDE] {name} 분석 중...")
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_data,
                    },
                },
                {"type": "text", "text": prompt},
            ],
        }],
    )

    return {
        "page": name,
        "image": image_path.name,
        "analysis": response.content[0].text,
        "timestamp": datetime.now().isoformat(),
    }


# ── 보고서 생성 ───────────────────────────────────────────────────────────────

def generate_report(results: list[dict]) -> str:
    """분석 결과를 Markdown 보고서로 생성합니다."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        "# UI/UX Visual Check Report — Profit-Lab",
        f"",
        f"**생성일시**: {now}  ",
        f"**분석 도구**: Claude Vision (claude-sonnet-4-6)  ",
        f"**분석 페이지**: {', '.join(r['page'] for r in results)}  ",
        "",
        "---",
        "",
    ]

    for result in results:
        lines += [
            f"## {result['page'].upper()} 페이지",
            f"",
            f"**스크린샷**: `{result['image']}`  ",
            f"**분석 시각**: {result['timestamp']}",
            "",
            result["analysis"],
            "",
            "---",
            "",
        ]

    return "\n".join(lines)


# ── 메인 ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Profit-Lab UI/UX Visual Check")
    parser.add_argument(
        "--pages", nargs="+",
        default=list(PAGES.keys()),
        choices=list(PAGES.keys()),
        help="분석할 페이지 목록 (기본: 전체)",
    )
    parser.add_argument(
        "--save-only", action="store_true",
        help="스크린샷만 저장하고 AI 분석을 건너뜁니다",
    )
    parser.add_argument(
        "--report", default=str(REPORT_PATH),
        help=f"보고서 저장 경로 (기본: {REPORT_PATH})",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Profit-Lab UI/UX Visual Check")
    print("=" * 60)
    print(f"앱 버전: v{_APP_VERSION}")
    print(f"저장 폴더: results/screenshots/v{_APP_VERSION}/{_RUN_TS}/")
    print(f"대상 페이지: {', '.join(args.pages)}")
    print(f"모드: {'스크린샷만' if args.save_only else 'AI 분석 포함'}")
    print()

    # 1. 스크린샷 캡처
    print("[Step 1] 스크린샷 캡처")
    captured = capture_screenshots(args.pages)

    if not captured:
        print("[ERROR] 캡처된 스크린샷이 없습니다. 서버가 실행 중인지 확인하세요.")
        sys.exit(1)

    print(f"\n총 {len(captured)}개 페이지 캡처 완료")

    if args.save_only:
        print("\n[--save-only 모드] AI 분석을 건너뜁니다.")
        print(f"스크린샷 저장 위치: {SCREENSHOT_DIR}")
        return

    # 2. Claude Vision 분석
    print("\n[Step 2] Claude Vision 분석")
    results = []
    for name, path in captured.items():
        result = analyze_with_claude(name, path)
        results.append(result)
        print(f"  ✓ {name} 분석 완료")

    # 3. 보고서 생성 (visual_report.md 는 스크린샷과 같은 폴더에 저장)
    print("\n[Step 3] 보고서 생성")
    report_content = generate_report(results)
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report_content, encoding="utf-8")
    print(f"  보고서 저장됨: {report_path}")

    print("\n" + "=" * 60)
    print("완료!")
    print(f"스크린샷: {SCREENSHOT_DIR}")
    print(f"보고서:   {report_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
