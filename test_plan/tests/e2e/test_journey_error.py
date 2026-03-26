"""User Journey: 에러/예외 처리 + UX 품질 (UI/UX 자동화 테스트)

전제: 백엔드(8000)와 프론트엔드(3001)가 실행 중이어야 합니다.
  Backend:  cd backend && uvicorn main:app --port 8000
  Frontend: cd frontend && npm run dev  (port 3001)

Run:
  pytest tests/e2e/test_journey_error.py -v --screenshot=only-on-failure
"""
import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:3001"


# ── Journey ERR-1: 라우팅 및 페이지 접근성 ───────────────────────────────────

class TestPageAccessibility:
    def test_home_page_accessible(self, page: Page):
        """홈 페이지(/) 접근이 정상 동작한다."""
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        assert page.url.startswith(BASE_URL)
        expect(page.locator("body")).to_be_visible()

    def test_backtest_page_accessible(self, page: Page):
        """백테스트 페이지(/backtest) 접근이 정상 동작한다."""
        page.goto(f"{BASE_URL}/backtest")
        page.wait_for_load_state("networkidle")
        assert "/backtest" in page.url

    def test_benchmark_page_accessible(self, page: Page):
        """벤치마크 페이지(/benchmark) 접근이 정상 동작한다."""
        page.goto(f"{BASE_URL}/benchmark")
        page.wait_for_load_state("networkidle")
        assert "benchmark" in page.url

    def test_leaderboard_page_accessible(self, page: Page):
        """리더보드 페이지(/benchmark/models) 접근이 정상 동작한다."""
        page.goto(f"{BASE_URL}/benchmark/models")
        page.wait_for_load_state("networkidle")
        expect(page.locator("body")).to_be_visible()

    def test_404_page_not_blank(self, page: Page):
        """존재하지 않는 경로 접근 시 빈 화면이 아닌 안내가 표시된다."""
        page.goto(f"{BASE_URL}/nonexistent-page-xyz-abc")
        page.wait_for_load_state("networkidle")
        body_text = page.locator("body").inner_text()
        assert len(body_text.strip()) > 0, "404 페이지가 완전히 빈 화면입니다"


# ── Journey ERR-2: 입력 유효성 에러 처리 ──────────────────────────────────────

class TestInputValidationErrors:
    def test_benchmark_empty_model_name_error(self, page: Page):
        """벤치마크: 모델명 없이 제출 시 에러 메시지가 표시된다."""
        page.goto(f"{BASE_URL}/benchmark")
        page.wait_for_load_state("networkidle")
        page.get_by_text("주문 제출", exact=False).first.click()
        page.wait_for_timeout(400)
        body_text = page.locator("body").inner_text()
        assert "모델" in body_text, "모델명 미입력 에러 피드백이 없습니다"

    def test_benchmark_no_stacktrace_in_error(self, page: Page):
        """에러 발생 시 스택트레이스(Traceback, TypeError 등)가 UI에 노출되지 않는다."""
        page.goto(f"{BASE_URL}/benchmark")
        page.wait_for_load_state("networkidle")
        page.get_by_text("주문 제출", exact=False).first.click()
        page.wait_for_timeout(400)
        body_text = page.locator("body").inner_text()
        for leak in ["Traceback", "TypeError", "AttributeError", "at Object.", "stack:"]:
            assert leak not in body_text, f"스택트레이스 노출: {leak}"

    def test_backtest_run_no_crash_without_coins(self, page: Page):
        """백테스트: 코인을 모두 해제하고 실행해도 페이지가 크래시되지 않는다."""
        page.goto(f"{BASE_URL}/backtest")
        page.wait_for_load_state("networkidle")
        # 기본 선택 코인들 해제 시도
        for coin in ["BTC", "ETH", "SOL", "XRP", "HYPE"]:
            btn = page.get_by_role("button", name=coin).first
            if btn.count() > 0:
                btn.click()
        page.get_by_role("button", name="백테스트 실행").click()
        page.wait_for_timeout(500)
        expect(page.locator("body")).to_be_visible()


# ── Journey ERR-3: UX 품질 검증 ──────────────────────────────────────────────

class TestUXQuality:
    def test_all_pages_have_nav(self, page: Page):
        """모든 주요 페이지에 네비게이션 바가 존재한다."""
        for path in ["/", "/backtest", "/benchmark", "/benchmark/models"]:
            page.goto(f"{BASE_URL}{path}")
            page.wait_for_load_state("networkidle")
            # nav 또는 header 태그 또는 네비게이션 링크 확인
            nav_exists = (
                page.locator("nav").count() > 0 or
                page.locator("header").count() > 0 or
                page.get_by_role("link", name="backtest").count() > 0 or
                page.get_by_role("link", name="benchmark").count() > 0
            )
            assert nav_exists, f"{path} 페이지에 네비게이션이 없습니다"

    def test_pages_have_no_horizontal_overflow(self, page: Page):
        """주요 페이지에서 수평 스크롤바(overflow)가 없다."""
        for path in ["/", "/backtest", "/benchmark"]:
            page.goto(f"{BASE_URL}{path}")
            page.wait_for_load_state("networkidle")
            scroll_width = page.evaluate("document.documentElement.scrollWidth")
            client_width = page.evaluate("document.documentElement.clientWidth")
            assert scroll_width <= client_width + 5, \
                f"{path} 페이지에 수평 오버플로우가 있습니다 ({scroll_width} > {client_width})"

    def test_benchmark_submit_button_disabled_while_loading(self, page: Page):
        """벤치마크 제출 버튼은 제출 중에 중복 클릭을 방지한다."""
        page.goto(f"{BASE_URL}/benchmark")
        page.wait_for_load_state("networkidle")
        # 모델명 입력
        page.locator("input[type='text']").first.fill("LOAD_TEST_MODEL")
        page.wait_for_timeout(300)
        btn_text = page.get_by_text("주문 제출", exact=False).first
        btn_text.click()
        page.wait_for_timeout(150)
        # 로딩 중: disabled 또는 텍스트 변경
        body_text = page.locator("body").inner_text()
        is_loading = "제출 중" in body_text or "loading" in body_text.lower()
        # 제출 즉시 결과 페이지로 이동해도 테스트 통과
        assert is_loading or "/benchmark/models/" in page.url, \
            "제출 중 로딩 피드백 또는 리디렉션이 없습니다"

    def test_footer_visible_on_main_pages(self, page: Page):
        """주요 페이지 하단에 푸터가 표시된다."""
        for path in ["/backtest", "/benchmark"]:
            page.goto(f"{BASE_URL}{path}")
            page.wait_for_load_state("networkidle")
            footer_exists = (
                page.locator("footer").count() > 0 or
                page.get_by_text("PROFIT LAB", exact=False).count() > 0 or
                page.get_by_text("SYSTEM_READY", exact=False).count() > 0
            )
            assert footer_exists, f"{path} 페이지에 푸터가 없습니다"

    def test_no_console_errors_on_load(self, page: Page):
        """페이지 로드 시 심각한 콘솔 에러(TypeError, ReferenceError)가 없다."""
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        for path in ["/", "/backtest", "/benchmark"]:
            page.goto(f"{BASE_URL}{path}")
            page.wait_for_load_state("networkidle")
        critical = [e for e in errors if "TypeError" in e or "ReferenceError" in e]
        assert len(critical) == 0, f"심각한 JS 에러 발생: {critical}"
