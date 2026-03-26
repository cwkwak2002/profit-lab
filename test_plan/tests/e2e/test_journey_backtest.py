"""User Journey: Backtest (UI/UX 자동화 테스트)

전제: 백엔드(8000)와 프론트엔드(3001)가 실행 중이어야 합니다.
  Backend:  cd backend && uvicorn main:app --port 8000
  Frontend: cd frontend && npm run dev  (port 3001)

Run:
  pytest tests/e2e/test_journey_backtest.py -v --screenshot=only-on-failure
  pytest tests/e2e/test_journey_backtest.py -v --screenshot=on
"""
import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:3001"
BACKTEST_URL = f"{BASE_URL}/backtest"


@pytest.fixture(autouse=True)
def goto_backtest(page: Page):
    page.goto(BACKTEST_URL, wait_until="load")
    page.wait_for_timeout(500)


# ── Journey B-1: 페이지 기본 요소 ─────────────────────────────────────────────

class TestBacktestPageLoad:
    def test_page_loads(self, page: Page):
        """백테스트 페이지가 정상 로드된다."""
        expect(page).not_to_have_title("")

    def test_strategy_buttons_visible(self, page: Page):
        """RSI DIV / EMA TREND / BB SQUEEZE 전략 버튼이 모두 표시된다."""
        for label in ["RSI DIV", "EMA TREND", "BB SQUEEZE"]:
            expect(page.get_by_text(label).first).to_be_visible()

    def test_date_range_inputs_present(self, page: Page):
        """시작일·종료일 date 입력 필드가 2개 존재한다."""
        inputs = page.locator("input[type='date']")
        expect(inputs).to_have_count(2)

    def test_run_button_present(self, page: Page):
        """'백테스트 실행' 버튼이 표시된다."""
        btn = page.get_by_role("button", name="백테스트 실행")
        expect(btn).to_be_visible()

    def test_coin_list_visible(self, page: Page):
        """코인 목록(BTC, ETH, SOL)이 표시된다."""
        for coin in ["BTC", "ETH", "SOL"]:
            expect(page.get_by_text(coin).first).to_be_visible()

    def test_no_error_on_load(self, page: Page):
        """페이지 로드 시 에러 텍스트가 없다."""
        expect(page.locator("body")).not_to_contain_text("Error")
        expect(page.locator("body")).not_to_contain_text("500")


# ── Journey B-2: 전략 선택 상호작용 ──────────────────────────────────────────

class TestBacktestStrategySelection:
    def test_click_ema_trend(self, page: Page):
        """EMA TREND 클릭 후 페이지가 에러 없이 유지된다."""
        page.get_by_role("button", name="EMA TREND").click()
        page.wait_for_timeout(300)
        expect(page.locator("body")).not_to_contain_text("Error")

    def test_click_bb_squeeze(self, page: Page):
        """BB SQUEEZE 클릭 후 페이지가 에러 없이 유지된다."""
        page.get_by_role("button", name="BB SQUEEZE").click()
        page.wait_for_timeout(300)
        expect(page.locator("body")).not_to_contain_text("Error")

    def test_switch_strategy_back_to_rsi(self, page: Page):
        """전략 전환 후 RSI DIV 재선택이 가능하다."""
        page.get_by_role("button", name="EMA TREND").click()
        page.wait_for_timeout(200)
        page.get_by_role("button", name="RSI DIV").click()
        page.wait_for_timeout(200)
        expect(page.get_by_role("button", name="RSI DIV")).to_be_visible()

    def test_strategy_description_updates(self, page: Page):
        """전략 클릭 시 설명 텍스트가 화면에 존재한다."""
        page.get_by_role("button", name="EMA TREND").click()
        page.wait_for_timeout(300)
        # EMA 전략 설명 키워드
        expect(page.get_by_text("EMA", exact=False).first).to_be_visible()


# ── Journey B-3: 날짜 입력 ────────────────────────────────────────────────────

class TestBacktestDateInput:
    def test_start_date_accepts_value(self, page: Page):
        """시작일 입력 필드에 날짜를 입력할 수 있다."""
        date_input = page.locator("input[type='date']").nth(0)
        date_input.fill("2025-01-01")
        assert date_input.input_value() == "2025-01-01"

    def test_end_date_accepts_value(self, page: Page):
        """종료일 입력 필드에 날짜를 입력할 수 있다."""
        date_input = page.locator("input[type='date']").nth(1)
        date_input.fill("2025-03-01")
        assert date_input.input_value() == "2025-03-01"

    def test_run_button_enabled_after_date_set(self, page: Page):
        """날짜 설정 후 실행 버튼이 활성화 상태를 유지한다."""
        page.locator("input[type='date']").nth(0).fill("2025-01-01")
        page.locator("input[type='date']").nth(1).fill("2025-03-01")
        btn = page.get_by_role("button", name="백테스트 실행")
        expect(btn).not_to_be_disabled()


# ── Journey B-4: 코인 토글 ────────────────────────────────────────────────────

class TestBacktestCoinToggle:
    def test_coin_button_clickable(self, page: Page):
        """코인 버튼 클릭 시 에러 없이 상태가 변경된다."""
        page.get_by_role("button", name="ETH").first.click()
        expect(page.locator("body")).not_to_contain_text("Error")

    def test_multiple_coin_clicks(self, page: Page):
        """여러 코인을 연속 클릭해도 에러가 없다."""
        for coin in ["ETH", "SOL", "XRP", "DOGE"]:
            page.get_by_role("button", name=coin).first.click()
        expect(page.locator("body")).not_to_contain_text("Error")

    def test_coin_deselect_reselect(self, page: Page):
        """코인 선택 해제 후 재선택이 가능하다."""
        btn = page.get_by_role("button", name="BTC").first
        btn.click()  # deselect
        btn.click()  # reselect
        expect(page.locator("body")).not_to_contain_text("Error")


# ── Journey B-5: 실행 버튼 동작 ──────────────────────────────────────────────

class TestBacktestRunButton:
    def test_run_button_not_disabled_initially(self, page: Page):
        """초기 상태에서 실행 버튼은 비활성화되지 않는다."""
        btn = page.get_by_role("button", name="백테스트 실행")
        expect(btn).not_to_be_disabled()

    def test_run_button_click_no_crash(self, page: Page):
        """실행 버튼 클릭 시 페이지가 크래시되지 않는다."""
        btn = page.get_by_role("button", name="백테스트 실행")
        btn.click()
        page.wait_for_timeout(500)
        expect(page.locator("body")).to_be_visible()

    def test_run_button_shows_loading_state(self, page: Page):
        """실행 버튼 클릭 후 로딩 피드백 또는 결과가 표시된다."""
        btn = page.locator("button", has_text="백테스트 실행")
        btn.click()
        page.wait_for_timeout(500)
        body_text = page.locator("body").inner_text()
        # 로딩 중이거나 / 결과가 표시되거나 / 에러 피드백 중 하나
        has_feedback = (
            "실행 중" in body_text or
            "loading" in body_text.lower() or
            "결과" in body_text or
            "에러" in body_text or
            "오류" in body_text or
            "코인을" in body_text
        )
        assert has_feedback or page.url != page.url, "실행 버튼 클릭 후 아무 반응이 없습니다"


# ── Journey B-6: 홈 페이지 요소 ──────────────────────────────────────────────

class TestHomePage:
    def test_home_page_loads(self, page: Page):
        """홈 페이지(/)가 정상 로드된다."""
        page.goto(BASE_URL, wait_until="load")
        expect(page.locator("body")).to_be_visible()

    def test_home_hero_text_visible(self, page: Page):
        """홈 히어로 섹션에 'TRADE' 또는 'SMARTER' 텍스트가 있다."""
        page.goto(BASE_URL, wait_until="load")
        page.wait_for_timeout(500)
        hero_text = page.get_by_text("TRADE", exact=False).first
        expect(hero_text).to_be_visible()

    def test_home_cta_buttons_present(self, page: Page):
        """홈에 'RUN_BENCHMARK.EXE' 또는 'START_SIMULATION' 링크가 있다."""
        page.goto(BASE_URL, wait_until="load")
        page.wait_for_timeout(500)
        link = page.get_by_text("RUN_BENCHMARK.EXE").first
        expect(link).to_be_visible()

    def test_home_leaderboard_section(self, page: Page):
        """홈 페이지에 LEADERBOARD 섹션이 있다."""
        page.goto(BASE_URL, wait_until="load")
        page.wait_for_timeout(500)
        expect(page.get_by_text("LEADERBOARD").first).to_be_visible()

    def test_home_start_simulation_link(self, page: Page):
        """'START_SIMULATION' 클릭 시 /backtest로 이동한다."""
        page.goto(BASE_URL, wait_until="load")
        page.wait_for_timeout(500)
        page.get_by_text("START_SIMULATION").first.click()
        page.wait_for_url("**/backtest**", timeout=10000)
        assert "/backtest" in page.url
