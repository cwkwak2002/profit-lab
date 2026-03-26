"""User Journey: Benchmark (UI/UX 자동화 테스트)

전제: 백엔드(8000)와 프론트엔드(3001)가 실행 중이어야 합니다.
  Backend:  cd backend && uvicorn main:app --port 8000
  Frontend: cd frontend && npm run dev  (port 3001)

Run:
  pytest tests/e2e/test_journey_benchmark.py -v --screenshot=only-on-failure
  pytest tests/e2e/test_journey_benchmark.py -v --screenshot=on
"""
import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:3001"
BENCHMARK_URL = f"{BASE_URL}/benchmark"
LEADERBOARD_URL = f"{BASE_URL}/benchmark/models"


def _wait_spinner(page: Page, timeout: int = 5000):
    """'불러오는 중' 스피너가 사라질 때까지 대기."""
    try:
        page.get_by_text("불러오는 중", exact=False).wait_for(state="hidden", timeout=timeout)
    except Exception:
        pass


# ── Journey BM-1: 주문 입력 페이지 기본 요소 ─────────────────────────────────

class TestBenchmarkOrderPage:
    def test_page_loads(self, page: Page):
        """벤치마크 주문 입력 페이지가 정상 로드된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        expect(page).not_to_have_title("")

    def test_model_name_input_visible(self, page: Page):
        """AI 모델명 입력 필드가 표시된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        name_input = page.locator("input[type='text']").first
        expect(name_input).to_be_visible()

    def test_market_analysis_textarea_visible(self, page: Page):
        """시장 분석 텍스트에어리어가 표시된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        expect(page.locator("textarea").first).to_be_visible()

    def test_add_order_button_present(self, page: Page):
        """+추가 버튼이 표시된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("button", name="+추가")).to_be_visible()

    def test_submit_button_present(self, page: Page):
        """주문 제출 버튼이 표시된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        expect(page.get_by_text("주문 제출", exact=False).first).to_be_visible()

    def test_live_benchmark_nav_button(self, page: Page):
        """'Live Benchmark' 네비게이션 버튼이 표시된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("button", name="Live Benchmark")).to_be_visible()

    def test_order_card_labels_visible(self, page: Page):
        """주문 카드에 코인·SIDE·유형·TP1·SL 레이블이 있다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        for label in ["코인", "SIDE", "유형", "TP1", "SL"]:
            expect(page.get_by_text(label, exact=False).first).to_be_visible()

    def test_no_error_on_load(self, page: Page):
        """페이지 로드 시 에러 텍스트가 없다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        expect(page.locator("body")).not_to_contain_text("500")


# ── Journey BM-2: 모델명 입력 ─────────────────────────────────────────────────

class TestBenchmarkModelInput:
    def test_model_name_accepts_input(self, page: Page):
        """모델명 입력 필드에 텍스트를 입력할 수 있다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        name_input = page.locator("input[type='text']").first
        name_input.fill("TEST_MODEL_01")
        assert name_input.input_value() == "TEST_MODEL_01"

    def test_available_balance_label_visible(self, page: Page):
        """AVAILABLE_BALANCE 레이블이 표시된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        expect(page.get_by_text("AVAILABLE_BALANCE", exact=False).first).to_be_visible()

    def test_empty_model_name_submit_shows_error(self, page: Page):
        """모델명 없이 제출 시 에러 피드백이 표시된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        page.get_by_text("주문 제출", exact=False).first.click()
        page.wait_for_timeout(400)
        body_text = page.locator("body").inner_text()
        has_error = "모델" in body_text and ("입력" in body_text or "이름" in body_text)
        assert has_error, "모델명 미입력 시 에러 피드백이 없습니다"


# ── Journey BM-3: 주문 카드 상호작용 ─────────────────────────────────────────

class TestBenchmarkOrderCard:
    def test_add_order_increases_card_count(self, page: Page):
        """+추가 클릭 시 ORDER 02 카드가 생성된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="+추가").click()
        page.wait_for_timeout(200)
        expect(page.get_by_text("ORDER 02", exact=False).first).to_be_visible()

    def test_remove_order_removes_last_card(self, page: Page):
        """× 삭제 클릭 시 마지막 주문 카드가 제거된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="+추가").click()
        page.wait_for_timeout(200)
        page.get_by_role("button", name="× 삭제").last.click()
        page.wait_for_timeout(200)
        assert page.get_by_text("ORDER 02", exact=False).count() == 0

    def test_side_toggle_short(self, page: Page):
        """SHORT 버튼 클릭 시 에러 없이 동작한다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="SHORT").first.click()
        page.wait_for_timeout(200)
        expect(page.locator("body")).not_to_contain_text("Error")

    def test_confidence_button_clickable(self, page: Page):
        """Confidence 레벨 버튼(1~5)을 클릭할 수 있다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        # 숫자 버튼은 여러 개 있으므로 첫 번째 1~5 버튼 클릭
        for level in [1, 2, 3, 4, 5]:
            btn = page.locator(f"button:has-text('{level}')").first
            if btn.count() > 0:
                btn.click()
        expect(page.locator("body")).not_to_contain_text("Error")

    def test_clear_all_removes_orders(self, page: Page):
        """'전체삭제' 클릭 시 주문 카드가 모두 제거된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="+추가").click()
        page.wait_for_timeout(200)
        page.get_by_role("button", name="전체삭제").click()
        page.wait_for_timeout(200)
        assert page.get_by_text("ORDER 01", exact=False).count() == 0

    def test_analysis_only_changes_submit_label(self, page: Page):
        """주문 없이 시장 분석만 입력 시 '▶ 분석 제출'로 버튼이 변경된다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="전체삭제").click()
        page.wait_for_timeout(200)
        page.locator("textarea").first.fill("시장 분석 내용입니다.")
        page.wait_for_timeout(400)
        expect(page.get_by_text("분석 제출", exact=False).first).to_be_visible()


# ── Journey BM-4: 리더보드 페이지 ────────────────────────────────────────────

class TestBenchmarkLeaderboard:
    def test_leaderboard_page_loads(self, page: Page):
        """리더보드 페이지가 정상 로드된다."""
        page.goto(LEADERBOARD_URL)
        page.wait_for_load_state("networkidle")
        _wait_spinner(page)
        expect(page.locator("body")).to_be_visible()

    def test_leaderboard_renders_content(self, page: Page):
        """리더보드에 모델 목록 또는 빈 상태 메시지가 표시된다."""
        page.goto(LEADERBOARD_URL)
        page.wait_for_load_state("networkidle")
        _wait_spinner(page)
        has_empty = page.get_by_text("아직 등록된 모델이 없습니다", exact=False).count() > 0
        has_header = page.get_by_text("리더보드", exact=False).count() > 0
        assert has_empty or has_header, "리더보드 페이지 컨텐츠가 없습니다"

    def test_leaderboard_no_500_error(self, page: Page):
        """리더보드 로드 시 500 에러가 없다."""
        page.goto(LEADERBOARD_URL)
        page.wait_for_load_state("networkidle")
        _wait_spinner(page)
        expect(page.locator("body")).not_to_contain_text("500")

    def test_leaderboard_has_rankings_when_models_exist(self, page: Page):
        """모델이 있을 때 'AI 트레이딩 리더보드' 헤딩이 표시된다."""
        page.goto(LEADERBOARD_URL)
        page.wait_for_load_state("networkidle")
        _wait_spinner(page)
        if page.get_by_text("아직 등록된 모델이 없습니다", exact=False).count() > 0:
            pytest.skip("등록된 모델 없음 — 모델 등록 후 재실행")
        expect(page.get_by_text("AI 트레이딩 리더보드")).to_be_visible()

    def test_live_benchmark_button_navigates_to_leaderboard(self, page: Page):
        """주문 입력 페이지의 'Live Benchmark' 버튼 클릭 시 리더보드로 이동한다."""
        page.goto(BENCHMARK_URL)
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="Live Benchmark").click()
        page.wait_for_load_state("networkidle")
        assert "/benchmark/models" in page.url
