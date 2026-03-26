# Profit-Lab QA 테스트 결과 보고서

| 항목 | 값 |
|------|----|
| **실행 일시** | 2026-03-26 16:07:48 |
| **소요 시간** | 99.42s |
| **실행 주체** | QA 팀 (test_plan/) |
| **최종 결과** | ❌ FAILED |

## 결과 요약

| 결과 | 건수 |
|------|------|
| ✅ Passed  | 55 |
| ❌ Failed  | 4 |
| ⏭️ Skipped | 0 |
| **Total**  | **59** |

## 파일별 결과

| 파일 | ✅ | ❌ | ⏭️ |
|------|----|----|-----|
| `test_journey_backtest.py` | 23 | 1 | 0 |
| `test_journey_benchmark.py` | 20 | 2 | 0 |
| `test_journey_error.py` | 12 | 1 | 0 |

## 전체 TC 목록

| # | 파일 | 클래스 | 테스트명 | 결과 | 비고 |
|---|------|--------|---------|------|------|
| 1 | `test_journey_backtest.py` | `TestBacktestPageLoad` | `test_page_loads[chromium]` | ✅ |  |
| 2 | `test_journey_backtest.py` | `TestBacktestPageLoad` | `test_strategy_buttons_visible[chromium]` | ✅ |  |
| 3 | `test_journey_backtest.py` | `TestBacktestPageLoad` | `test_date_range_inputs_present[chromium]` | ✅ |  |
| 4 | `test_journey_backtest.py` | `TestBacktestPageLoad` | `test_run_button_present[chromium]` | ✅ |  |
| 5 | `test_journey_backtest.py` | `TestBacktestPageLoad` | `test_coin_list_visible[chromium]` | ✅ |  |
| 6 | `test_journey_backtest.py` | `TestBacktestPageLoad` | `test_no_error_on_load[chromium]` | ✅ |  |
| 7 | `test_journey_backtest.py` | `TestBacktestStrategySelection` | `test_click_ema_trend[chromium]` | ✅ |  |
| 8 | `test_journey_backtest.py` | `TestBacktestStrategySelection` | `test_click_bb_squeeze[chromium]` | ✅ |  |
| 9 | `test_journey_backtest.py` | `TestBacktestStrategySelection` | `test_switch_strategy_back_to_rsi[chromium]` | ✅ |  |
| 10 | `test_journey_backtest.py` | `TestBacktestStrategySelection` | `test_strategy_description_updates[chromium]` | ✅ |  |
| 11 | `test_journey_backtest.py` | `TestBacktestDateInput` | `test_start_date_accepts_value[chromium]` | ✅ |  |
| 12 | `test_journey_backtest.py` | `TestBacktestDateInput` | `test_end_date_accepts_value[chromium]` | ✅ |  |
| 13 | `test_journey_backtest.py` | `TestBacktestDateInput` | `test_run_button_enabled_after_date_set[chromium]` | ✅ |  |
| 14 | `test_journey_backtest.py` | `TestBacktestCoinToggle` | `test_coin_button_clickable[chromium]` | ✅ |  |
| 15 | `test_journey_backtest.py` | `TestBacktestCoinToggle` | `test_multiple_coin_clicks[chromium]` | ✅ |  |
| 16 | `test_journey_backtest.py` | `TestBacktestCoinToggle` | `test_coin_deselect_reselect[chromium]` | ✅ |  |
| 17 | `test_journey_backtest.py` | `TestBacktestRunButton` | `test_run_button_not_disabled_initially[chromium]` | ✅ |  |
| 18 | `test_journey_backtest.py` | `TestBacktestRunButton` | `test_run_button_click_no_crash[chromium]` | ✅ |  |
| 19 | `test_journey_backtest.py` | `TestBacktestRunButton` | `test_run_button_shows_loading_state[chromium]` | ❌ | playwright._impl._errors.TimeoutError: Locator.is_disabled: Timeout 3000ms exceeded. |
| 20 | `test_journey_backtest.py` | `TestHomePage` | `test_home_page_loads[chromium]` | ✅ |  |
| 21 | `test_journey_backtest.py` | `TestHomePage` | `test_home_hero_text_visible[chromium]` | ✅ |  |
| 22 | `test_journey_backtest.py` | `TestHomePage` | `test_home_cta_buttons_present[chromium]` | ✅ |  |
| 23 | `test_journey_backtest.py` | `TestHomePage` | `test_home_leaderboard_section[chromium]` | ✅ |  |
| 24 | `test_journey_backtest.py` | `TestHomePage` | `test_home_start_simulation_link[chromium]` | ✅ |  |
| 25 | `test_journey_benchmark.py` | `TestBenchmarkOrderPage` | `test_page_loads[chromium]` | ✅ |  |
| 26 | `test_journey_benchmark.py` | `TestBenchmarkOrderPage` | `test_model_name_input_visible[chromium]` | ✅ |  |
| 27 | `test_journey_benchmark.py` | `TestBenchmarkOrderPage` | `test_market_analysis_textarea_visible[chromium]` | ✅ |  |
| 28 | `test_journey_benchmark.py` | `TestBenchmarkOrderPage` | `test_add_order_button_present[chromium]` | ✅ |  |
| 29 | `test_journey_benchmark.py` | `TestBenchmarkOrderPage` | `test_submit_button_present[chromium]` | ✅ |  |
| 30 | `test_journey_benchmark.py` | `TestBenchmarkOrderPage` | `test_live_benchmark_nav_button[chromium]` | ✅ |  |
| 31 | `test_journey_benchmark.py` | `TestBenchmarkOrderPage` | `test_order_card_labels_visible[chromium]` | ✅ |  |
| 32 | `test_journey_benchmark.py` | `TestBenchmarkOrderPage` | `test_no_error_on_load[chromium]` | ✅ |  |
| 33 | `test_journey_benchmark.py` | `TestBenchmarkModelInput` | `test_model_name_accepts_input[chromium]` | ✅ |  |
| 34 | `test_journey_benchmark.py` | `TestBenchmarkModelInput` | `test_available_balance_label_visible[chromium]` | ✅ |  |
| 35 | `test_journey_benchmark.py` | `TestBenchmarkModelInput` | `test_empty_model_name_submit_shows_error[chromium]` | ✅ |  |
| 36 | `test_journey_benchmark.py` | `TestBenchmarkOrderCard` | `test_add_order_increases_card_count[chromium]` | ✅ |  |
| 37 | `test_journey_benchmark.py` | `TestBenchmarkOrderCard` | `test_remove_order_removes_last_card[chromium]` | ✅ |  |
| 38 | `test_journey_benchmark.py` | `TestBenchmarkOrderCard` | `test_side_toggle_short[chromium]` | ✅ |  |
| 39 | `test_journey_benchmark.py` | `TestBenchmarkOrderCard` | `test_confidence_button_clickable[chromium]` | ✅ |  |
| 40 | `test_journey_benchmark.py` | `TestBenchmarkOrderCard` | `test_clear_all_removes_orders[chromium]` | ✅ |  |
| 41 | `test_journey_benchmark.py` | `TestBenchmarkOrderCard` | `test_analysis_only_changes_submit_label[chromium]` | ✅ |  |
| 42 | `test_journey_benchmark.py` | `TestBenchmarkLeaderboard` | `test_leaderboard_page_loads[chromium]` | ✅ |  |
| 43 | `test_journey_benchmark.py` | `TestBenchmarkLeaderboard` | `test_leaderboard_renders_content[chromium]` | ❌ | AssertionError: 리더보드 페이지 컨텐츠가 없습니다 |
| 44 | `test_journey_benchmark.py` | `TestBenchmarkLeaderboard` | `test_leaderboard_no_500_error[chromium]` | ✅ |  |
| 45 | `test_journey_benchmark.py` | `TestBenchmarkLeaderboard` | `test_leaderboard_has_rankings_when_models_exist[chromium]` | ❌ | AssertionError: Locator expected to be visible |
| 46 | `test_journey_benchmark.py` | `TestBenchmarkLeaderboard` | `test_live_benchmark_button_navigates_to_leaderboard[chromium]` | ✅ |  |
| 47 | `test_journey_error.py` | `TestPageAccessibility` | `test_home_page_accessible[chromium]` | ✅ |  |
| 48 | `test_journey_error.py` | `TestPageAccessibility` | `test_backtest_page_accessible[chromium]` | ✅ |  |
| 49 | `test_journey_error.py` | `TestPageAccessibility` | `test_benchmark_page_accessible[chromium]` | ✅ |  |
| 50 | `test_journey_error.py` | `TestPageAccessibility` | `test_leaderboard_page_accessible[chromium]` | ✅ |  |
| 51 | `test_journey_error.py` | `TestPageAccessibility` | `test_404_page_not_blank[chromium]` | ✅ |  |
| 52 | `test_journey_error.py` | `TestInputValidationErrors` | `test_benchmark_empty_model_name_error[chromium]` | ✅ |  |
| 53 | `test_journey_error.py` | `TestInputValidationErrors` | `test_benchmark_no_stacktrace_in_error[chromium]` | ✅ |  |
| 54 | `test_journey_error.py` | `TestInputValidationErrors` | `test_backtest_run_no_crash_without_coins[chromium]` | ✅ |  |
| 55 | `test_journey_error.py` | `TestUXQuality` | `test_all_pages_have_nav[chromium]` | ✅ |  |
| 56 | `test_journey_error.py` | `TestUXQuality` | `test_pages_have_no_horizontal_overflow[chromium]` | ✅ |  |
| 57 | `test_journey_error.py` | `TestUXQuality` | `test_benchmark_submit_button_disabled_while_loading[chromium]` | ❌ | AssertionError: 제출 중 로딩 피드백 또는 리디렉션이 없습니다 |
| 58 | `test_journey_error.py` | `TestUXQuality` | `test_footer_visible_on_main_pages[chromium]` | ✅ |  |
| 59 | `test_journey_error.py` | `TestUXQuality` | `test_no_console_errors_on_load[chromium]` | ✅ |  |

## 실패 상세

### ❌ `test_journey_backtest.py::TestBacktestRunButton::test_run_button_shows_loading_state[chromium]`
```
playwright._impl._errors.TimeoutError: Locator.is_disabled: Timeout 3000ms exceeded.
```

### ❌ `test_journey_benchmark.py::TestBenchmarkLeaderboard::test_leaderboard_renders_content[chromium]`
```
AssertionError: 리더보드 페이지 컨텐츠가 없습니다
```

### ❌ `test_journey_benchmark.py::TestBenchmarkLeaderboard::test_leaderboard_has_rankings_when_models_exist[chromium]`
```
AssertionError: Locator expected to be visible
```

### ❌ `test_journey_error.py::TestUXQuality::test_benchmark_submit_button_disabled_while_loading[chromium]`
```
AssertionError: 제출 중 로딩 피드백 또는 리디렉션이 없습니다
```
