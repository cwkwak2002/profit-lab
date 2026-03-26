#!/bin/bash
# UI/UX 자동화 테스트 실행 스크립트 (test_plan/ 기준)
#
# 사용법 — test_plan/ 폴더에서 실행:
#   ./tests/e2e/run_ui_test.sh             # Stage 1 + Stage 2 전체 실행
#   ./tests/e2e/run_ui_test.sh --stage1    # Playwright TC만 실행
#   ./tests/e2e/run_ui_test.sh --stage2    # AI Visual Check만 실행
#   ./tests/e2e/run_ui_test.sh --screenshot # 스크린샷만 저장 (API 불필요)
#
# 전제 조건:
#   - 백엔드: cd backend && uvicorn main:app --port 8000
#   - 프론트: cd frontend && npm run dev (port 3001)
#   - ANTHROPIC_API_KEY 환경변수 (Stage 2 AI 분석 시)

set -e

# ── 경로 설정 ──────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_PLAN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"   # test_plan/
BACKEND_DIR="$(cd "$TEST_PLAN_DIR/.." && pwd)/backend"

# test_plan/ 을 작업 디렉터리로 고정
cd "$TEST_PLAN_DIR"

# venv 활성화 (backend/venv 우선)
if [ -f "$BACKEND_DIR/venv/bin/activate" ]; then
    source "$BACKEND_DIR/venv/bin/activate"
elif [ -f "$(dirname "$TEST_PLAN_DIR")/venv/bin/activate" ]; then
    source "$(dirname "$TEST_PLAN_DIR")/venv/bin/activate"
fi

# ── 인수 파싱 ──────────────────────────────────────────────────────────────────
STAGE1=true
STAGE2=true
SCREENSHOT_ONLY=false

for arg in "$@"; do
    case $arg in
        --stage1)     STAGE2=false ;;
        --stage2)     STAGE1=false ;;
        --screenshot) STAGE1=false; STAGE2=false; SCREENSHOT_ONLY=true ;;
    esac
done

echo "========================================"
echo " Profit-Lab UI/UX Automated Test"
echo " 실행 위치: test_plan/"
echo "========================================"
echo ""

# ── Stage 1: Playwright TC ────────────────────────────────────────────────────
if [ "$STAGE1" = true ]; then
    echo "[Stage 1] Playwright 기능 흐름 테스트"
    echo "----------------------------------------"
    echo "결과 보고서: results/test-runs/v*/{timestamp}/"
    echo ""

    # pytest.ini 가 test_plan/ 에 있으므로 여기서 바로 실행
    # conftest.py 훅이 results/test-runs/v{version}/{timestamp}/ 에 저장
    python -m pytest tests/e2e/ \
        -v \
        --screenshot=only-on-failure \
        --tb=short \
        -p no:cacheprovider \
        -m "journey or e2e"

    PYTEST_EXIT=$?

    if [ $PYTEST_EXIT -eq 0 ]; then
        echo ""
        echo "✅ Stage 1 PASSED"
    else
        echo ""
        echo "⚠️  Stage 1: 일부 실패"
    fi
    echo ""
fi

# ── Stage 2 / Screenshot Only ─────────────────────────────────────────────────
if [ "$STAGE2" = true ] || [ "$SCREENSHOT_ONLY" = true ]; then
    echo "[Stage 2] AI Visual Check (스크린샷 캡처)"
    echo "----------------------------------------"
    echo "결과 저장: results/screenshots/v*/{timestamp}/"
    echo ""

    if [ "$SCREENSHOT_ONLY" = true ]; then
        python tests/e2e/ai_visual_check.py --save-only
    elif [ -z "$ANTHROPIC_API_KEY" ]; then
        echo "⚠️  ANTHROPIC_API_KEY 가 설정되지 않았습니다 — 스크린샷만 저장합니다."
        python tests/e2e/ai_visual_check.py --save-only
    else
        python tests/e2e/ai_visual_check.py
    fi

    echo ""
    echo "✅ Stage 2 완료 — results/screenshots/ 폴더를 확인하세요"
fi

echo ""
echo "========================================"
echo " 완료"
echo "========================================"
