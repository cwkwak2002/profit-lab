# Profit-Lab QA 테스트 결과 보고서

| 항목 | 값 |
|------|----|
| **실행 일시** | 2026-03-26 15:25:48 |
| **소요 시간** | 8.30s |
| **실행 주체** | QA 팀 (test_plan/) |
| **최종 결과** | ✅ PASSED |

## 결과 요약

| 결과 | 건수 |
|------|------|
| ✅ Passed  | 273 |
| ❌ Failed  | 0 |
| ⏭️ Skipped | 1 |
| **Total**  | **274** |

## 파일별 결과

| 파일 | ✅ | ❌ | ⏭️ |
|------|----|----|-----|
| `test_ai_trader.py` | 17 | 0 | 0 |
| `test_api.py` | 13 | 0 | 0 |
| `test_backtester.py` | 11 | 0 | 0 |
| `test_benchmark_api.py` | 33 | 0 | 0 |
| `test_benchmark_monitor.py` | 30 | 0 | 0 |
| `test_benchmark_new.py` | 24 | 0 | 0 |
| `test_data_api_new.py` | 14 | 0 | 0 |
| `test_db.py` | 12 | 0 | 0 |
| `test_e2e_backtest.py` | 9 | 0 | 1 |
| `test_e2e_benchmark.py` | 10 | 0 | 0 |
| `test_integration_backtest.py` | 9 | 0 | 0 |
| `test_risk_filters.py` | 16 | 0 | 0 |
| `test_strategy.py` | 17 | 0 | 0 |
| `test_strategy_bb.py` | 15 | 0 | 0 |
| `test_strategy_ema.py` | 16 | 0 | 0 |
| `test_telegram_listener.py` | 27 | 0 | 0 |

## 전체 TC 목록

| # | 파일 | 클래스 | 테스트명 | 결과 | 비고 |
|---|------|--------|---------|------|------|
| 1 | `test_ai_trader.py` | `TestBuildUserPrompt` | `test_prompt_contains_coin_names` | ✅ |  |
| 2 | `test_ai_trader.py` | `TestBuildUserPrompt` | `test_prompt_contains_timestamp` | ✅ |  |
| 3 | `test_ai_trader.py` | `TestBuildUserPrompt` | `test_prompt_contains_price_and_volume` | ✅ |  |
| 4 | `test_ai_trader.py` | `TestBuildUserPrompt` | `test_prompt_json_format_hint` | ✅ |  |
| 5 | `test_ai_trader.py` | `TestBuildUserPrompt` | `test_prompt_coin_list_constraint` | ✅ |  |
| 6 | `test_ai_trader.py` | `TestCallClaude` | `test_parses_plain_json` | ✅ |  |
| 7 | `test_ai_trader.py` | `TestCallClaude` | `test_strips_markdown_code_fence` | ✅ |  |
| 8 | `test_ai_trader.py` | `TestCallClaude` | `test_raises_on_non_array_response` | ✅ |  |
| 9 | `test_ai_trader.py` | `TestCallClaude` | `test_raises_on_invalid_json` | ✅ |  |
| 10 | `test_ai_trader.py` | `TestSubmitOrders` | `test_valid_long_order_inserted` | ✅ |  |
| 11 | `test_ai_trader.py` | `TestSubmitOrders` | `test_valid_short_order_inserted` | ✅ |  |
| 12 | `test_ai_trader.py` | `TestSubmitOrders` | `test_invalid_long_skipped_tp_below_entry` | ✅ |  |
| 13 | `test_ai_trader.py` | `TestSubmitOrders` | `test_invalid_short_skipped_tp_above_entry` | ✅ |  |
| 14 | `test_ai_trader.py` | `TestSubmitOrders` | `test_unknown_coin_skipped` | ✅ |  |
| 15 | `test_ai_trader.py` | `TestSubmitOrders` | `test_multiple_orders_split_margin_equally` | ✅ |  |
| 16 | `test_ai_trader.py` | `TestSubmitOrders` | `test_confidence_mapping` | ✅ |  |
| 17 | `test_ai_trader.py` | `TestSubmitOrders` | `test_empty_recommendations_no_insert` | ✅ |  |
| 18 | `test_api.py` | `TestHealthEndpoint` | `test_health` | ✅ |  |
| 19 | `test_api.py` | `TestCandlesEndpoint` | `test_get_candles_empty` | ✅ |  |
| 20 | `test_api.py` | `TestCandlesEndpoint` | `test_get_candles_invalid_timeframe` | ✅ |  |
| 21 | `test_api.py` | `TestCandlesEndpoint` | `test_get_candles_with_data` | ✅ |  |
| 22 | `test_api.py` | `TestCandlesEndpoint` | `test_get_candles_1m_no_resample` | ✅ |  |
| 23 | `test_api.py` | `TestBacktestEndpoints` | `test_run_backtest` | ✅ |  |
| 24 | `test_api.py` | `TestBacktestEndpoints` | `test_get_summary` | ✅ |  |
| 25 | `test_api.py` | `TestBacktestEndpoints` | `test_get_summary_404` | ✅ |  |
| 26 | `test_api.py` | `TestBacktestEndpoints` | `test_get_coins` | ✅ |  |
| 27 | `test_api.py` | `TestBacktestEndpoints` | `test_get_coin_trades` | ✅ |  |
| 28 | `test_api.py` | `TestBacktestEndpoints` | `test_get_coin_trades_404` | ✅ |  |
| 29 | `test_api.py` | `TestBacktestEndpoints` | `test_full_pipeline_consistency` | ✅ |  |
| 30 | `test_api.py` | `TestBacktestEndpoints` | `test_empty_coin_data` | ✅ |  |
| 31 | `test_backtester.py` | `TestMsToIso` | `test_known_timestamp` | ✅ |  |
| 32 | `test_backtester.py` | `TestMsToIso` | `test_zero` | ✅ |  |
| 33 | `test_backtester.py` | `TestRunBacktestForCoin` | `test_no_signals_returns_empty` | ✅ |  |
| 34 | `test_backtester.py` | `TestRunBacktestForCoin` | `test_summary_fields_present` | ✅ |  |
| 35 | `test_backtester.py` | `TestRunBacktestForCoin` | `test_trade_record_fields` | ✅ |  |
| 36 | `test_backtester.py` | `TestRunBacktestForCoin` | `test_balance_compounding` | ✅ |  |
| 37 | `test_backtester.py` | `TestRunBacktestForCoin` | `test_custom_seed_and_leverage` | ✅ |  |
| 38 | `test_backtester.py` | `TestRunBacktestForCoin` | `test_exit_reason_is_valid` | ✅ |  |
| 39 | `test_backtester.py` | `TestRunBacktestForCoin` | `test_win_rate_calculation` | ✅ |  |
| 40 | `test_backtester.py` | `TestRunBacktestForCoin` | `test_max_drawdown_non_negative` | ✅ |  |
| 41 | `test_backtester.py` | `TestRunBacktestForCoin` | `test_no_overlapping_positions` | ✅ |  |
| 42 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_submit_long_limit_order` | ✅ |  |
| 43 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_submit_short_limit_order` | ✅ |  |
| 44 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_market_order_is_immediately_filled` | ✅ |  |
| 45 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_limit_order_is_pending` | ✅ |  |
| 46 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_long_tp_below_entry_rejected` | ✅ |  |
| 47 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_long_sl_above_entry_rejected` | ✅ |  |
| 48 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_short_tp_above_entry_rejected` | ✅ |  |
| 49 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_short_sl_below_entry_rejected` | ✅ |  |
| 50 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_unknown_symbol_rejected` | ✅ |  |
| 51 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_zero_price_rejected` | ✅ |  |
| 52 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_analysis_only_no_orders` | ✅ |  |
| 53 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_empty_request_rejected` | ✅ |  |
| 54 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_dual_tp_long_validation` | ✅ |  |
| 55 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_dual_tp_short_validation` | ✅ |  |
| 56 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_confidence_out_of_range` | ✅ |  |
| 57 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_margin_split_equally` | ✅ |  |
| 58 | `test_benchmark_api.py` | `TestSubmitOrders` | `test_same_model_reused` | ✅ |  |
| 59 | `test_benchmark_api.py` | `TestModelEndpoints` | `test_list_models_empty` | ✅ |  |
| 60 | `test_benchmark_api.py` | `TestModelEndpoints` | `test_list_models_after_submit` | ✅ |  |
| 61 | `test_benchmark_api.py` | `TestModelEndpoints` | `test_get_model_detail_404` | ✅ |  |
| 62 | `test_benchmark_api.py` | `TestModelEndpoints` | `test_get_model_computes_metrics` | ✅ |  |
| 63 | `test_benchmark_api.py` | `TestModelEndpoints` | `test_rename_model` | ✅ |  |
| 64 | `test_benchmark_api.py` | `TestModelEndpoints` | `test_rename_duplicate_rejected` | ✅ |  |
| 65 | `test_benchmark_api.py` | `TestModelEndpoints` | `test_delete_model` | ✅ |  |
| 66 | `test_benchmark_api.py` | `TestModelEndpoints` | `test_model_names_autocomplete` | ✅ |  |
| 67 | `test_benchmark_api.py` | `TestOrderEndpoints` | `test_patch_pending_order_prices` | ✅ |  |
| 68 | `test_benchmark_api.py` | `TestOrderEndpoints` | `test_patch_filled_order_description_only` | ✅ |  |
| 69 | `test_benchmark_api.py` | `TestOrderEndpoints` | `test_patch_filled_order_price_rejected` | ✅ |  |
| 70 | `test_benchmark_api.py` | `TestOrderEndpoints` | `test_patch_order_invalid_price_relation` | ✅ |  |
| 71 | `test_benchmark_api.py` | `TestBatchEndpoints` | `test_get_model_batches` | ✅ |  |
| 72 | `test_benchmark_api.py` | `TestBatchEndpoints` | `test_delete_batch_cancels_pending` | ✅ |  |
| 73 | `test_benchmark_api.py` | `TestBatchEndpoints` | `test_delete_batch_keeps_closed` | ✅ |  |
| 74 | `test_benchmark_api.py` | `TestBatchEndpoints` | `test_update_batch_analysis` | ✅ |  |
| 75 | `test_benchmark_monitor.py` | `TestCalcPnl` | `test_long_profit` | ✅ |  |
| 76 | `test_benchmark_monitor.py` | `TestCalcPnl` | `test_long_loss` | ✅ |  |
| 77 | `test_benchmark_monitor.py` | `TestCalcPnl` | `test_short_profit` | ✅ |  |
| 78 | `test_benchmark_monitor.py` | `TestCalcPnl` | `test_short_loss` | ✅ |  |
| 79 | `test_benchmark_monitor.py` | `TestCalcPnl` | `test_fees_reduce_pnl` | ✅ |  |
| 80 | `test_benchmark_monitor.py` | `TestCalcPnl` | `test_loss_capped_at_margin` | ✅ |  |
| 81 | `test_benchmark_monitor.py` | `TestCalcPnl` | `test_leverage_multiplies_position` | ✅ |  |
| 82 | `test_benchmark_monitor.py` | `TestProcessPending` | `test_long_fills_at_entry` | ✅ |  |
| 83 | `test_benchmark_monitor.py` | `TestProcessPending` | `test_short_fills_at_entry` | ✅ |  |
| 84 | `test_benchmark_monitor.py` | `TestProcessPending` | `test_long_not_filled_above_entry` | ✅ |  |
| 85 | `test_benchmark_monitor.py` | `TestProcessPending` | `test_cancelled_after_30_min` | ✅ |  |
| 86 | `test_benchmark_monitor.py` | `TestProcessPending` | `test_not_cancelled_before_30_min` | ✅ |  |
| 87 | `test_benchmark_monitor.py` | `TestProcessPending` | `test_broadcast_on_fill` | ✅ |  |
| 88 | `test_benchmark_monitor.py` | `TestProcessPending` | `test_broadcast_on_cancel` | ✅ |  |
| 89 | `test_benchmark_monitor.py` | `TestProcessFilled` | `test_long_tp_hit` | ✅ |  |
| 90 | `test_benchmark_monitor.py` | `TestProcessFilled` | `test_long_sl_hit` | ✅ |  |
| 91 | `test_benchmark_monitor.py` | `TestProcessFilled` | `test_short_tp_hit` | ✅ |  |
| 92 | `test_benchmark_monitor.py` | `TestProcessFilled` | `test_short_sl_hit` | ✅ |  |
| 93 | `test_benchmark_monitor.py` | `TestProcessFilled` | `test_timeout_after_6h` | ✅ |  |
| 94 | `test_benchmark_monitor.py` | `TestProcessFilled` | `test_skip_check_within_60s` | ✅ |  |
| 95 | `test_benchmark_monitor.py` | `TestProcessFilled` | `test_dual_tp1_hit` | ✅ |  |
| 96 | `test_benchmark_monitor.py` | `TestProcessFilled` | `test_dual_tp2_hit_after_tp1` | ✅ |  |
| 97 | `test_benchmark_monitor.py` | `TestProcessFilled` | `test_dual_sl_be_after_tp1` | ✅ |  |
| 98 | `test_benchmark_monitor.py` | `TestProcessFilled` | `test_balance_updated_on_close` | ✅ |  |
| 99 | `test_benchmark_monitor.py` | `TestProcessFilled` | `test_broadcast_on_close` | ✅ |  |
| 100 | `test_benchmark_monitor.py` | `TestRecoverSingleOrder` | `test_recover_pending_fill` | ✅ |  |
| 101 | `test_benchmark_monitor.py` | `TestRecoverSingleOrder` | `test_recover_pending_cancel` | ✅ |  |
| 102 | `test_benchmark_monitor.py` | `TestRecoverSingleOrder` | `test_recover_filled_tp` | ✅ |  |
| 103 | `test_benchmark_monitor.py` | `TestRecoverSingleOrder` | `test_recover_filled_sl` | ✅ |  |
| 104 | `test_benchmark_monitor.py` | `TestRecoverSingleOrder` | `test_recover_sl_priority_over_tp` | ✅ |  |
| 105 | `test_benchmark_new.py` | `TestRenameModel` | `test_rename_success` | ✅ |  |
| 106 | `test_benchmark_new.py` | `TestRenameModel` | `test_rename_duplicate_name_returns_400` | ✅ |  |
| 107 | `test_benchmark_new.py` | `TestRenameModel` | `test_rename_empty_name_returns_400` | ✅ |  |
| 108 | `test_benchmark_new.py` | `TestRenameModel` | `test_rename_unknown_model_returns_404` | ✅ |  |
| 109 | `test_benchmark_new.py` | `TestDeleteModel` | `test_delete_model_removes_all_data` | ✅ |  |
| 110 | `test_benchmark_new.py` | `TestDeleteModel` | `test_delete_unknown_model_returns_404` | ✅ |  |
| 111 | `test_benchmark_new.py` | `TestPatchOrder` | `test_patch_pending_entry_price` | ✅ |  |
| 112 | `test_benchmark_new.py` | `TestPatchOrder` | `test_patch_pending_confidence` | ✅ |  |
| 113 | `test_benchmark_new.py` | `TestPatchOrder` | `test_patch_filled_order_description_only` | ✅ |  |
| 114 | `test_benchmark_new.py` | `TestPatchOrder` | `test_patch_invalid_long_tp_below_entry` | ✅ |  |
| 115 | `test_benchmark_new.py` | `TestPatchOrder` | `test_patch_unknown_order_returns_404` | ✅ |  |
| 116 | `test_benchmark_new.py` | `TestPatchBatch` | `test_patch_batch_market_analysis` | ✅ |  |
| 117 | `test_benchmark_new.py` | `TestPatchBatch` | `test_patch_unknown_batch_returns_404` | ✅ |  |
| 118 | `test_benchmark_new.py` | `TestDeleteBatch` | `test_delete_batch_cancels_pending_orders` | ✅ |  |
| 119 | `test_benchmark_new.py` | `TestDeleteBatch` | `test_delete_batch_preserves_filled_orders` | ✅ |  |
| 120 | `test_benchmark_new.py` | `TestDeleteBatch` | `test_delete_unknown_batch_returns_404` | ✅ |  |
| 121 | `test_benchmark_new.py` | `TestSourceField` | `test_manual_order_has_source_manual` | ✅ |  |
| 122 | `test_benchmark_new.py` | `TestSourceField` | `test_orders_endpoint_returns_source_field` | ✅ |  |
| 123 | `test_benchmark_new.py` | `TestTP2Validation` | `test_long_tp2_must_be_above_tp1` | ✅ |  |
| 124 | `test_benchmark_new.py` | `TestTP2Validation` | `test_short_tp2_must_be_below_tp1` | ✅ |  |
| 125 | `test_benchmark_new.py` | `TestTP2Validation` | `test_valid_long_tp2_accepted` | ✅ |  |
| 126 | `test_benchmark_new.py` | `TestMarketOrderType` | `test_market_order_stored_correctly` | ✅ |  |
| 127 | `test_benchmark_new.py` | `TestMarketOrderType` | `test_limit_order_stored_correctly` | ✅ |  |
| 128 | `test_benchmark_new.py` | `TestLiveOrderValidation` | `test_order_rejected_when_price_exceeds_tp` | ✅ |  |
| 129 | `test_data_api_new.py` | `TestTickerEndpoint` | `test_ticker_returns_price` | ✅ |  |
| 130 | `test_data_api_new.py` | `TestTickerEndpoint` | `test_ticker_returns_timestamp` | ✅ |  |
| 131 | `test_data_api_new.py` | `TestTickerEndpoint` | `test_ticker_exchange_error_returns_500` | ✅ |  |
| 132 | `test_data_api_new.py` | `TestSymbolsEndpoint` | `test_symbols_returns_list` | ✅ |  |
| 133 | `test_data_api_new.py` | `TestCandlesResample` | `test_5m_resampled_from_1m` | ✅ |  |
| 134 | `test_data_api_new.py` | `TestCandlesResample` | `test_15m_resampled_from_1m` | ✅ |  |
| 135 | `test_data_api_new.py` | `TestCandlesResample` | `test_30m_resampled_from_1m` | ✅ |  |
| 136 | `test_data_api_new.py` | `TestCandlesResample` | `test_4h_resampled_from_1h` | ✅ |  |
| 137 | `test_data_api_new.py` | `TestCandlesResample` | `test_1D_resampled_from_1h` | ✅ |  |
| 138 | `test_data_api_new.py` | `TestCandlesResample` | `test_invalid_timeframe_returns_400` | ✅ |  |
| 139 | `test_data_api_new.py` | `TestCandlesResample` | `test_resample_ohlc_correctness` | ✅ |  |
| 140 | `test_data_api_new.py` | `TestCandlesStrategyIndicators` | `test_ema_trend_indicators_present` | ✅ |  |
| 141 | `test_data_api_new.py` | `TestCandlesStrategyIndicators` | `test_bb_squeeze_indicators_present` | ✅ |  |
| 142 | `test_data_api_new.py` | `TestCandlesStrategyIndicators` | `test_rsi_divergence_rsi_present` | ✅ |  |
| 143 | `test_db.py` | `TestCandleOperations` | `test_save_and_get_candles` | ✅ |  |
| 144 | `test_db.py` | `TestCandleOperations` | `test_get_candles_filters_by_range` | ✅ |  |
| 145 | `test_db.py` | `TestCandleOperations` | `test_get_candles_filters_by_symbol` | ✅ |  |
| 146 | `test_db.py` | `TestCandleOperations` | `test_duplicate_candles_ignored` | ✅ |  |
| 147 | `test_db.py` | `TestCandleOperations` | `test_empty_result` | ✅ |  |
| 148 | `test_db.py` | `TestBacktestRunOperations` | `test_save_and_get_run` | ✅ |  |
| 149 | `test_db.py` | `TestBacktestRunOperations` | `test_get_nonexistent_run` | ✅ |  |
| 150 | `test_db.py` | `TestCoinSummaryOperations` | `test_save_and_get_summaries` | ✅ |  |
| 151 | `test_db.py` | `TestCoinSummaryOperations` | `test_empty_summaries` | ✅ |  |
| 152 | `test_db.py` | `TestTradeOperations` | `test_save_and_get_trades` | ✅ |  |
| 153 | `test_db.py` | `TestTradeOperations` | `test_get_trades_filters_by_symbol` | ✅ |  |
| 154 | `test_db.py` | `TestTradeOperations` | `test_empty_trades` | ✅ |  |
| 155 | `test_e2e_backtest.py` | `TestE2EBacktest` | `test_full_rsi_pipeline` | ✅ |  |
| 156 | `test_e2e_backtest.py` | `TestE2EBacktest` | `test_full_ema_pipeline` | ✅ |  |
| 157 | `test_e2e_backtest.py` | `TestE2EBacktest` | `test_full_bb_pipeline` | ✅ |  |
| 158 | `test_e2e_backtest.py` | `TestE2EBacktest` | `test_summary_trade_count_matches_coin_sum` | ✅ |  |
| 159 | `test_e2e_backtest.py` | `TestE2EBacktest` | `test_coin_trade_count_matches_detail` | ✅ |  |
| 160 | `test_e2e_backtest.py` | `TestE2EBacktest` | `test_balance_monotonically_tracked` | ✅ |  |
| 161 | `test_e2e_backtest.py` | `TestE2EBacktest` | `test_no_overlapping_trades` | ⏭️ |  |
| 162 | `test_e2e_backtest.py` | `TestE2EBacktest` | `test_exit_reasons_are_valid` | ✅ |  |
| 163 | `test_e2e_backtest.py` | `TestE2EBacktest` | `test_multiple_runs_are_independent` | ✅ |  |
| 164 | `test_e2e_backtest.py` | `TestE2EBacktest` | `test_404_for_unknown_run` | ✅ |  |
| 165 | `test_e2e_benchmark.py` | `TestE2EBenchmark` | `test_full_order_lifecycle_limit` | ✅ |  |
| 166 | `test_e2e_benchmark.py` | `TestE2EBenchmark` | `test_full_order_lifecycle_market` | ✅ |  |
| 167 | `test_e2e_benchmark.py` | `TestE2EBenchmark` | `test_leaderboard_after_multiple_models` | ✅ |  |
| 168 | `test_e2e_benchmark.py` | `TestE2EBenchmark` | `test_balance_reflects_market_order_cost` | ✅ |  |
| 169 | `test_e2e_benchmark.py` | `TestE2EBenchmark` | `test_batch_deletion_flow` | ✅ |  |
| 170 | `test_e2e_benchmark.py` | `TestE2EBenchmark` | `test_model_metrics_zero_when_no_closed` | ✅ |  |
| 171 | `test_e2e_benchmark.py` | `TestE2EBenchmark` | `test_model_rename_then_resubmit` | ✅ |  |
| 172 | `test_e2e_benchmark.py` | `TestE2EBenchmark` | `test_delete_model_cleans_all` | ✅ |  |
| 173 | `test_e2e_benchmark.py` | `TestE2EBenchmark` | `test_available_balance_decreases_with_orders` | ✅ |  |
| 174 | `test_e2e_benchmark.py` | `TestE2EBenchmark` | `test_get_model_orders_sorted_by_created` | ✅ |  |
| 175 | `test_integration_backtest.py` | `TestBacktestStrategyRouting` | `test_ema_strategy_accepted` | ✅ |  |
| 176 | `test_integration_backtest.py` | `TestBacktestStrategyRouting` | `test_bb_strategy_accepted` | ✅ |  |
| 177 | `test_integration_backtest.py` | `TestBacktestStrategyRouting` | `test_invalid_strategy_rejected` | ✅ |  |
| 178 | `test_integration_backtest.py` | `TestBacktestStrategyRouting` | `test_default_strategy_is_rsi` | ✅ |  |
| 179 | `test_integration_backtest.py` | `TestBacktestStrategyRouting` | `test_ema_summary_has_correct_fields` | ✅ |  |
| 180 | `test_integration_backtest.py` | `TestBacktestStrategyRouting` | `test_bb_summary_has_correct_fields` | ✅ |  |
| 181 | `test_integration_backtest.py` | `TestBacktestStrategyRouting` | `test_multi_coin_backtest` | ✅ |  |
| 182 | `test_integration_backtest.py` | `TestBacktestStrategyRouting` | `test_stream_endpoint_emits_done` | ✅ |  |
| 183 | `test_integration_backtest.py` | `TestBacktestStrategyRouting` | `test_stream_progress_increases` | ✅ |  |
| 184 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_ema_gap_too_small_blocks` | ✅ |  |
| 185 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_ema_gap_sufficient_passes` | ✅ |  |
| 186 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_trapped_between_emas_blocks` | ✅ |  |
| 187 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_price_outside_ema_zone_passes` | ✅ |  |
| 188 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_adx_below_20_blocks` | ✅ |  |
| 189 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_adx_above_20_passes` | ✅ |  |
| 190 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_spike_within_cooldown_blocks` | ✅ |  |
| 191 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_spike_outside_cooldown_passes` | ✅ |  |
| 192 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_btc_crash_blocks_altcoin_long` | ✅ |  |
| 193 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_btc_crash_does_not_block_short` | ✅ |  |
| 194 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_btc_crash_does_not_block_btc_itself` | ✅ |  |
| 195 | `test_risk_filters.py` | `TestShouldBlockSignal` | `test_no_btc_data_passes` | ✅ |  |
| 196 | `test_risk_filters.py` | `TestCheckBBExpansionFilter` | `test_long_blocked_when_lower_band_rising` | ✅ |  |
| 197 | `test_risk_filters.py` | `TestCheckBBExpansionFilter` | `test_long_allowed_when_lower_band_falling` | ✅ |  |
| 198 | `test_risk_filters.py` | `TestCheckBBExpansionFilter` | `test_short_never_blocked` | ✅ |  |
| 199 | `test_risk_filters.py` | `TestCheckBBExpansionFilter` | `test_insufficient_bars_passes` | ✅ |  |
| 200 | `test_strategy.py` | `TestComputeRSI` | `test_rsi_returns_series` | ✅ |  |
| 201 | `test_strategy.py` | `TestComputeRSI` | `test_rsi_range` | ✅ |  |
| 202 | `test_strategy.py` | `TestComputeRSI` | `test_rsi_first_value_is_nan` | ✅ |  |
| 203 | `test_strategy.py` | `TestComputeRSI` | `test_rsi_all_up_near_100` | ✅ |  |
| 204 | `test_strategy.py` | `TestComputeRSI` | `test_rsi_all_down_near_0` | ✅ |  |
| 205 | `test_strategy.py` | `TestFindEntrySignals` | `test_no_signals_on_flat_market` | ✅ |  |
| 206 | `test_strategy.py` | `TestFindEntrySignals` | `test_no_signals_on_uptrend` | ✅ |  |
| 207 | `test_strategy.py` | `TestFindEntrySignals` | `test_signals_have_required_fields` | ✅ |  |
| 208 | `test_strategy.py` | `TestFindEntrySignals` | `test_entry_price_is_next_candle_open` | ✅ |  |
| 209 | `test_strategy.py` | `TestFindEntrySignals` | `test_sl_price_below_signal_low` | ✅ |  |
| 210 | `test_strategy.py` | `TestFindEntrySignals` | `test_rsi_threshold_filters` | ✅ |  |
| 211 | `test_strategy.py` | `TestSimulateExit` | `test_sl_hit` | ✅ |  |
| 212 | `test_strategy.py` | `TestSimulateExit` | `test_no_sl_hit_when_price_above_sl` | ✅ |  |
| 213 | `test_strategy.py` | `TestSimulateExit` | `test_tp1_by_price` | ✅ |  |
| 214 | `test_strategy.py` | `TestSimulateExit` | `test_empty_candles_returns_no_data` | ✅ |  |
| 215 | `test_strategy.py` | `TestSimulateExit` | `test_tp2_hit` | ✅ |  |
| 216 | `test_strategy.py` | `TestSimulateExit` | `test_be_after_tp1` | ✅ |  |
| 217 | `test_strategy_bb.py` | `TestBBFindEntrySignals` | `test_no_signals_high_volatility` | ✅ |  |
| 218 | `test_strategy_bb.py` | `TestBBFindEntrySignals` | `test_no_signals_insufficient_squeeze` | ✅ |  |
| 219 | `test_strategy_bb.py` | `TestBBFindEntrySignals` | `test_no_signals_low_volume_long` | ✅ |  |
| 220 | `test_strategy_bb.py` | `TestBBFindEntrySignals` | `test_no_signals_low_volume_short` | ✅ |  |
| 221 | `test_strategy_bb.py` | `TestBBFindEntrySignals` | `test_signals_have_required_fields` | ✅ |  |
| 222 | `test_strategy_bb.py` | `TestBBFindEntrySignals` | `test_long_sl_is_bb_midline` | ✅ |  |
| 223 | `test_strategy_bb.py` | `TestBBFindEntrySignals` | `test_short_sl_is_bb_midline` | ✅ |  |
| 224 | `test_strategy_bb.py` | `TestBBSimulateExit` | `test_long_sl_midline_hit` | ✅ |  |
| 225 | `test_strategy_bb.py` | `TestBBSimulateExit` | `test_long_trailing_stop_activates` | ✅ |  |
| 226 | `test_strategy_bb.py` | `TestBBSimulateExit` | `test_long_trailing_updates_on_new_high` | ✅ |  |
| 227 | `test_strategy_bb.py` | `TestBBSimulateExit` | `test_short_sl_midline_hit` | ✅ |  |
| 228 | `test_strategy_bb.py` | `TestBBSimulateExit` | `test_short_fixed_tp_hit` | ✅ |  |
| 229 | `test_strategy_bb.py` | `TestBBSimulateExit` | `test_long_timeout` | ✅ |  |
| 230 | `test_strategy_bb.py` | `TestBBSimulateExit` | `test_short_sl_via_bb_midline` | ✅ |  |
| 231 | `test_strategy_bb.py` | `TestBBSimulateExit` | `test_empty_candles_returns_no_data` | ✅ |  |
| 232 | `test_strategy_ema.py` | `TestEMAFindEntrySignals` | `test_no_signals_flat_market` | ✅ |  |
| 233 | `test_strategy_ema.py` | `TestEMAFindEntrySignals` | `test_no_signals_missing_15m` | ✅ |  |
| 234 | `test_strategy_ema.py` | `TestEMAFindEntrySignals` | `test_no_signals_below_adx_threshold` | ✅ |  |
| 235 | `test_strategy_ema.py` | `TestEMAFindEntrySignals` | `test_signals_have_required_fields` | ✅ |  |
| 236 | `test_strategy_ema.py` | `TestEMAFindEntrySignals` | `test_long_sl_below_entry` | ✅ |  |
| 237 | `test_strategy_ema.py` | `TestEMAFindEntrySignals` | `test_short_sl_above_entry` | ✅ |  |
| 238 | `test_strategy_ema.py` | `TestEMAFindEntrySignals` | `test_entry_price_is_next_candle_open` | ✅ |  |
| 239 | `test_strategy_ema.py` | `TestEMASimulateExit` | `test_long_sl_hit` | ✅ |  |
| 240 | `test_strategy_ema.py` | `TestEMASimulateExit` | `test_long_tp1_hit_then_phase2` | ✅ |  |
| 241 | `test_strategy_ema.py` | `TestEMASimulateExit` | `test_short_sl_hit` | ✅ |  |
| 242 | `test_strategy_ema.py` | `TestEMASimulateExit` | `test_short_tp1_hit_then_phase2` | ✅ |  |
| 243 | `test_strategy_ema.py` | `TestEMASimulateExit` | `test_long_be_stop_after_tp1` | ✅ |  |
| 244 | `test_strategy_ema.py` | `TestEMASimulateExit` | `test_short_be_stop_after_tp1` | ✅ |  |
| 245 | `test_strategy_ema.py` | `TestEMASimulateExit` | `test_long_ema_cross_exit` | ✅ |  |
| 246 | `test_strategy_ema.py` | `TestEMASimulateExit` | `test_timeout_no_exit` | ✅ |  |
| 247 | `test_strategy_ema.py` | `TestEMASimulateExit` | `test_empty_candles_returns_no_data` | ✅ |  |
| 248 | `test_telegram_listener.py` | `TestParseMirrolyEntry` | `test_longing_btc` | ✅ |  |
| 249 | `test_telegram_listener.py` | `TestParseMirrolyEntry` | `test_shorting_eth` | ✅ |  |
| 250 | `test_telegram_listener.py` | `TestParseMirrolyEntry` | `test_longing_without_now_prefix` | ✅ |  |
| 251 | `test_telegram_listener.py` | `TestParseMirrolyEntry` | `test_shorting_case_insensitive` | ✅ |  |
| 252 | `test_telegram_listener.py` | `TestParseMirrolyEntry` | `test_unknown_coin_returns_none` | ✅ |  |
| 253 | `test_telegram_listener.py` | `TestParseMirrolyExit` | `test_closed_btc_long` | ✅ |  |
| 254 | `test_telegram_listener.py` | `TestParseMirrolyExit` | `test_closed_eth_short` | ✅ |  |
| 255 | `test_telegram_listener.py` | `TestParseMirrolyExit` | `test_closed_no_side` | ✅ |  |
| 256 | `test_telegram_listener.py` | `TestParseMirrolyExit` | `test_exit_preferred_over_entry_for_closed` | ✅ |  |
| 257 | `test_telegram_listener.py` | `TestParseNoise` | `test_none_for_empty_string` | ✅ |  |
| 258 | `test_telegram_listener.py` | `TestParseNoise` | `test_none_for_plain_text` | ✅ |  |
| 259 | `test_telegram_listener.py` | `TestParseNoise` | `test_none_for_price_update` | ✅ |  |
| 260 | `test_telegram_listener.py` | `TestParseNoise` | `test_none_for_random_numbers` | ✅ |  |
| 261 | `test_telegram_listener.py` | `TestNormalizeCoin` | `test_lowercase_btc` | ✅ |  |
| 262 | `test_telegram_listener.py` | `TestNormalizeCoin` | `test_usdt_suffix_stripped` | ✅ |  |
| 263 | `test_telegram_listener.py` | `TestNormalizeCoin` | `test_none_input_returns_none` | ✅ |  |
| 264 | `test_telegram_listener.py` | `TestNormalizeCoin` | `test_unknown_coin_returns_none` | ✅ |  |
| 265 | `test_telegram_listener.py` | `TestNormalizeCoin` | `test_pepe_passthrough` | ✅ |  |
| 266 | `test_telegram_listener.py` | `TestHandleEntry` | `test_entry_inserts_order` | ✅ |  |
| 267 | `test_telegram_listener.py` | `TestHandleEntry` | `test_entry_skipped_when_no_market_price` | ✅ |  |
| 268 | `test_telegram_listener.py` | `TestHandleEntry` | `test_entry_skipped_duplicate_position` | ✅ |  |
| 269 | `test_telegram_listener.py` | `TestHandleEntry` | `test_entry_skipped_zero_balance` | ✅ |  |
| 270 | `test_telegram_listener.py` | `TestHandleExit` | `test_exit_closes_order_and_updates_balance` | ✅ |  |
| 271 | `test_telegram_listener.py` | `TestHandleExit` | `test_exit_long_profit_pnl_positive` | ✅ |  |
| 272 | `test_telegram_listener.py` | `TestHandleExit` | `test_exit_short_profit_pnl_positive` | ✅ |  |
| 273 | `test_telegram_listener.py` | `TestHandleExit` | `test_exit_no_open_position_is_noop` | ✅ |  |
| 274 | `test_telegram_listener.py` | `TestHandleExit` | `test_exit_skipped_when_no_market_price` | ✅ |  |