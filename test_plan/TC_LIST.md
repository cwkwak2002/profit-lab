# Profit-Lab TC (Test Case) 목록

version: 1.4 | date: 2026-03-26 | total: 352 (289 백엔드 + 63 UI/UX Playwright)

---

## Unit Tests

### strategy.rsi_divergence (`tests/test_strategy.py`) — 17 TC

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-RSI-01 | `test_rsi_range` | RSI 값 0~100 범위 | 모든 RSI 값 0 ≤ v ≤ 100 |
| U-RSI-02 | `test_rsi_first_value_is_nan` | 초기 NaN 처리 | 첫 번째 RSI 값 NaN |
| U-RSI-03 | `test_rsi_all_up_near_100` | 상승장 RSI ≈ 100 | RSI > 90 |
| U-RSI-04 | `test_rsi_all_down_near_0` | 하락장 RSI ≈ 0 | RSI < 10 |
| U-RSI-05 | `test_no_signals_on_flat_market` | 횡보장 시그널 없음 | 빈 리스트 반환 |
| U-RSI-06 | `test_no_signals_on_uptrend` | 상승장 시그널 없음 | 빈 리스트 반환 |
| U-RSI-07 | `test_signals_have_required_fields` | 시그널 필드 완전성 | side, entry_price, sl_price, tp1_target 포함 |
| U-RSI-08 | `test_entry_price_is_next_candle_open` | 진입가 = 다음 캔들 open | entry_price == candles[idx+1].open |
| U-RSI-09 | `test_sl_price_below_signal_low` | SL 가격 < 시그널 low | sl_price < signal_low |
| U-RSI-10 | `test_rsi_threshold_filters` | RSI 임계값 필터 | RSI 임계 초과 시 시그널 없음 |
| U-RSI-11 | `test_sl_hit` | SL 청산 | exit_reason="SL", pnl < 0 |
| U-RSI-12 | `test_no_sl_hit_when_price_above_sl` | SL 미달 시 유지 | 포지션 유지, 청산 없음 |
| U-RSI-13 | `test_tp1_by_price` | TP1 가격 도달 | tp1_hit=True |
| U-RSI-14 | `test_empty_candles_returns_no_data` | 빈 캔들 처리 | exit_reason="NO_DATA" |
| U-RSI-15 | `test_tp2_hit` | TP2 EMA 터치 | exit_reason="TP2" |
| U-RSI-16 | `test_be_after_tp1` | TP1 후 BE stop | exit_reason="BE", tp1_hit=True |
| U-RSI-17 | `test_timeout_no_exit` | 72h timeout | exit_reason="TIMEOUT" |

> 참고: `test_strategy.py`에는 `TestComputeRSI` (5 TC) + `TestFindEntrySignals` (6 TC) + `TestSimulateExit` (6 TC) = 17 TC

### strategy.ema_trend (`tests/test_strategy_ema.py`) — 16 TC

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-EMA-01 | `test_no_signals_flat_market` | 횡보장 시그널 없음 | 빈 리스트 반환 |
| U-EMA-02 | `test_no_signals_missing_15m` | 15m 데이터 없으면 시그널 없음 | 빈 리스트 반환 |
| U-EMA-03 | `test_no_signals_below_adx_threshold` | ADX < 임계값 → 시그널 없음 | 빈 리스트 반환 |
| U-EMA-04 | `test_signals_have_required_fields` | 시그널 필드 완전성 | side, entry_price, sl_price, tp1_target 포함 |
| U-EMA-05 | `test_long_sl_below_entry` | 롱 SL < 진입가 | sl_price < entry_price |
| U-EMA-06 | `test_short_sl_above_entry` | 숏 SL > 진입가 | sl_price > entry_price |
| U-EMA-07 | `test_entry_price_is_next_candle_open` | 진입가 = 다음 캔들 open | entry_price == candles[idx+1].open |
| U-EMA-08 | `test_long_sl_hit` | 롱 SL 청산 | exit_reason="SL", tp1_hit=False |
| U-EMA-09 | `test_long_tp1_hit_then_phase2` | 롱 TP1 후 Phase2 | tp1_hit=True, phase2 진입 |
| U-EMA-10 | `test_short_sl_hit` | 숏 SL 청산 | exit_reason="SL", tp1_hit=False |
| U-EMA-11 | `test_short_tp1_hit_then_phase2` | 숏 TP1 후 Phase2 | tp1_hit=True, phase2 진입 |
| U-EMA-12 | `test_long_be_after_tp1` | 롱 TP1 후 BE stop | exit_reason="BE", tp1_hit=True |
| U-EMA-13 | `test_short_be_stop_after_tp1` | 숏 TP1 후 BE stop | exit_reason="BE", tp1_hit=True |
| U-EMA-14 | `test_long_ema_cross_exit` | EMA 크로스 청산 | exit_reason="EMA_CROSS" |
| U-EMA-15 | `test_timeout_no_exit` | 시간초과 | exit_reason="TIMEOUT" |
| U-EMA-16 | `test_empty_candles_returns_no_data` | 빈 캔들 처리 | exit_reason="NO_DATA" |

### strategy.bb_squeeze (`tests/test_strategy_bb.py`) — 15 TC

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-BB-01 | `test_no_signals_high_volatility` | 고변동성 시그널 없음 | 빈 리스트 반환 |
| U-BB-02 | `test_no_signals_insufficient_squeeze` | squeeze 기간 부족 | 빈 리스트 반환 |
| U-BB-03 | `test_no_signals_low_volume_long` | 롱 볼륨 부족 | Long 시그널 없음 |
| U-BB-04 | `test_no_signals_low_volume_short` | 숏 볼륨 부족 | Short 시그널 없음 |
| U-BB-05 | `test_signals_have_required_fields` | 시그널 필드 완전성 | side, entry_price, sl_price, bb_mid 포함 |
| U-BB-06 | `test_long_sl_is_bb_midline` | 롱 SL = BB 중선 | sl_price == bb_mid |
| U-BB-07 | `test_short_sl_is_bb_midline` | 숏 SL = BB 중선 | sl_price == bb_mid |
| U-BB-08 | `test_long_sl_midline_hit` | 롱 중선 SL 청산 | exit_reason="SL" |
| U-BB-09 | `test_long_trailing_stop_activates` | 트레일링 스탑 활성화 | exit_reason="TRAIL", tp1_hit=True |
| U-BB-10 | `test_long_trailing_updates_on_new_high` | 신고가 시 트레일링 업데이트 | trailing_stop 값 증가 |
| U-BB-11 | `test_short_sl_midline_hit` | 숏 중선 SL 청산 | exit_reason="SL" |
| U-BB-12 | `test_short_fixed_tp_hit` | 숏 고정 TP 도달 | exit_reason="FIXED_TP" |
| U-BB-13 | `test_long_timeout` | 롱 시간초과 | exit_reason="TIMEOUT" |
| U-BB-14 | `test_short_sl_via_bb_midline` | 숏 BB 중선 SL | exit_reason="SL" |
| U-BB-15 | `test_empty_candles_returns_no_data` | 빈 캔들 처리 | exit_reason="NO_DATA" |

### strategy.risk_filters (`tests/test_risk_filters.py`) — 16 TC

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-RF-01 | `test_ema_gap_too_small_blocks` | EMA gap 미달 → 차단 | blocked=True, reason="RISK_EMA_GAP" |
| U-RF-02 | `test_ema_gap_sufficient_passes` | EMA gap 충분 → 통과 | blocked=False |
| U-RF-03 | `test_trapped_between_emas_blocks` | EMA 사이 갇힘 → 차단 | blocked=True, reason="RISK_TRAPPED" |
| U-RF-04 | `test_price_outside_ema_zone_passes` | EMA 외부 → 통과 | blocked=False |
| U-RF-05 | `test_adx_below_20_blocks` | ADX < 20 → 차단 | blocked=True, reason="RISK_ADX" |
| U-RF-06 | `test_adx_above_20_passes` | ADX ≥ 20 → 통과 | blocked=False |
| U-RF-07 | `test_spike_within_cooldown_blocks` | 스파이크 쿨다운 내 → 차단 | blocked=True, reason="RISK_SPIKE" |
| U-RF-08 | `test_spike_outside_cooldown_passes` | 스파이크 쿨다운 외 → 통과 | blocked=False |
| U-RF-09 | `test_btc_crash_blocks_altcoin_long` | BTC 급락 시 알트 롱 차단 | blocked=True, reason="RISK_BTC_CRASH" |
| U-RF-10 | `test_btc_crash_does_not_block_short` | BTC 급락 시 숏 차단 안 함 | blocked=False (Short은 예외) |
| U-RF-11 | `test_btc_crash_does_not_block_btc_itself` | BTC 급락 시 BTC 자체 차단 안 함 | blocked=False (BTC 자신 예외) |
| U-RF-12 | `test_no_btc_data_passes` | BTC 데이터 없으면 통과 | blocked=False |
| U-RF-13 | `test_long_blocked_when_lower_band_rising` | BB 하단 상승 시 롱 차단 | True 반환 |
| U-RF-14 | `test_long_allowed_when_lower_band_falling` | BB 하단 하락 시 롱 허용 | False 반환 |
| U-RF-15 | `test_short_never_blocked` | 숏은 BB 확장 필터 적용 안 함 | 항상 False 반환 |
| U-RF-16 | `test_insufficient_bars_passes` | 바 부족 시 통과 | False 반환 (데이터 부족) |

### engine.backtester (`tests/test_backtester.py`) — 11 TC

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-BT-01 | `test_known_timestamp` | 타임스탬프 변환 | 기대 datetime 문자열 반환 |
| U-BT-02 | `test_zero` | 0 타임스탬프 | epoch 기준 datetime 반환 |
| U-BT-03 | `test_no_signals_returns_empty` | 시그널 없음 → 빈 결과 | trades=[], summary.total_trades=0 |
| U-BT-04 | `test_summary_fields_present` | summary 필드 완전성 | total_trades, win_rate, cumulative_return, max_drawdown 포함 |
| U-BT-05 | `test_trade_record_fields` | trade 필드 완전성 | entry_price, exit_price, pnl, exit_reason 포함 |
| U-BT-06 | `test_balance_compounding` | 잔고 복리 계산 | 각 trade.balance_after = 이전 잔고 + pnl |
| U-BT-07 | `test_custom_seed_and_leverage` | 시드/레버리지 반영 | 지정 seed/leverage 기반 포지션 계산 |
| U-BT-08 | `test_exit_reason_is_valid` | exit_reason 유효 값 | SL/TP1/TP2/BE/TIMEOUT/NO_DATA 중 하나 |
| U-BT-09 | `test_win_rate_calculation` | 승률 계산 정확성 | win_rate = 수익 거래 수 / 총 거래 수 |
| U-BT-10 | `test_max_drawdown_non_negative` | MDD ≥ 0 | max_drawdown ≥ 0.0 |
| U-BT-11 | `test_no_overlapping_positions` | 포지션 겹침 없음 | 이전 exit_time < 현재 entry_time |

### data.db (`tests/test_db.py`) — 12 TC

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-DB-01 | `test_save_and_get_candles` | candle CRUD | 저장한 캔들이 조회됨 |
| U-DB-02 | `test_get_candles_filters_by_range` | 범위 필터 | 범위 내 캔들만 반환 |
| U-DB-03 | `test_get_candles_filters_by_symbol` | 심볼 필터 | 지정 심볼 캔들만 반환 |
| U-DB-04 | `test_duplicate_candles_ignored` | INSERT OR IGNORE | 중복 삽입 시 에러 없음, 총 수 유지 |
| U-DB-05 | `test_empty_result` | 빈 결과 | 빈 리스트 반환 |
| U-DB-06 | `test_save_and_get_run` | backtest run CRUD | 저장한 run이 조회됨 |
| U-DB-07 | `test_get_nonexistent_run` | 없는 run → None | None 반환 |
| U-DB-08 | `test_save_and_get_summaries` | summary 정렬 | cumulative_return 내림차순 정렬 |
| U-DB-09 | `test_empty_summaries` | 빈 summary | 빈 리스트 반환 |
| U-DB-10 | `test_save_and_get_trades` | trade CRUD | 저장한 trades가 조회됨 |
| U-DB-11 | `test_get_trades_filters_by_symbol` | 심볼 필터 | 지정 심볼 trades만 반환 |
| U-DB-12 | `test_empty_trades` | 빈 trades | 빈 리스트 반환 |

### engine.benchmark_monitor (`tests/test_benchmark_monitor.py`) — 35 TC

#### TestCalcPnl (7 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-BM-01 | `test_long_profit` | 롱 수익 계산 | pnl > 0 |
| U-BM-02 | `test_long_loss` | 롱 손실 계산 | pnl < 0 |
| U-BM-03 | `test_short_profit` | 숏 수익 계산 | pnl > 0 |
| U-BM-04 | `test_short_loss` | 숏 손실 계산 | pnl < 0 |
| U-BM-05 | `test_fees_reduce_pnl` | 수수료 차감 | 진입=청산 동일가여도 pnl < 0 |
| U-BM-06 | `test_loss_capped_at_margin` | 손실 마진 한도 | max(pnl) = -margin |
| U-BM-07 | `test_leverage_multiplies_position` | 레버리지 배수 반영 | 포지션 = margin × leverage |

#### TestProcessPending (7 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-BM-08 | `test_long_fills_at_entry` | 롱 진입가 fill | status=FILLED, fill_time 기록됨 |
| U-BM-09 | `test_short_fills_at_entry` | 숏 진입가 fill | status=FILLED |
| U-BM-10 | `test_long_not_filled_above_entry` | 롱 진입가 초과 미체결 | status=PENDING 유지 |
| U-BM-11 | `test_cancelled_after_30_min` | 30분 후 취소 | status=CANCELLED, reason=CANCEL_30M |
| U-BM-12 | `test_not_cancelled_before_30_min` | 30분 전 유지 | status=PENDING 유지 |
| U-BM-13 | `test_broadcast_on_fill` | fill 시 broadcast | type="order_filled" 이벤트 발생 |
| U-BM-14 | `test_broadcast_on_cancel` | cancel 시 broadcast | type="order_cancelled" 이벤트 발생 |

#### TestProcessFilled (11 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-BM-15 | `test_long_tp_hit` | 롱 TP 청산 | status=CLOSED, reason=TP |
| U-BM-16 | `test_long_sl_hit` | 롱 SL 청산 | status=CLOSED, reason=SL |
| U-BM-17 | `test_short_tp_hit` | 숏 TP 청산 | status=CLOSED, reason=TP |
| U-BM-18 | `test_short_sl_hit` | 숏 SL 청산 | status=CLOSED, reason=SL |
| U-BM-19 | `test_timeout_after_6h` | 6h timeout 청산 | status=CLOSED, reason=TIMEOUT_6H |
| U-BM-20 | `test_skip_check_within_60s` | 60초 내 INVALID 스킵 | 아무 상태 변경 없음 |
| U-BM-21 | `test_dual_tp1_hit` | Dual-TP TP1 도달 | tp1_hit=1, margin 50% 감소, SL→BE |
| U-BM-22 | `test_dual_tp2_hit_after_tp1` | Dual-TP TP2 도달 | status=CLOSED, reason=TP2 |
| U-BM-23 | `test_dual_sl_be_after_tp1` | Dual-TP TP1 후 BE SL | status=CLOSED, reason=SL_BE |
| U-BM-24 | `test_balance_updated_on_close` | 청산 시 잔고 업데이트 | balance = old_balance + pnl |
| U-BM-25 | `test_broadcast_on_close` | 청산 시 broadcast | type="order_closed" 이벤트 발생 |

#### TestRecoverSingleOrder (5 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-BM-26 | `test_recover_pending_fill` | PENDING 복구 → fill 조건 충족 시 FILLED | status=FILLED |
| U-BM-27 | `test_recover_pending_cancel` | PENDING 복구 → 30분 초과 시 CANCELLED | status=CANCELLED |
| U-BM-28 | `test_recover_filled_tp` | FILLED 복구 → TP 조건 충족 시 CLOSED | status=CLOSED, reason=TP |
| U-BM-29 | `test_recover_filled_sl` | FILLED 복구 → SL 조건 충족 시 CLOSED | status=CLOSED, reason=SL |
| U-BM-30 | `test_recover_sl_priority_over_tp` | SL과 TP 동시 조건 → SL 우선 | reason=SL (TP보다 SL 우선) |

### engine.ai_trader (`tests/test_ai_trader.py`) — 17 TC

#### TestBuildUserPrompt (5 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-AI-01 | `test_prompt_contains_coin_names` | 프롬프트에 코인명 포함 | BTC, ETH 등 코인명 문자열 포함 |
| U-AI-02 | `test_prompt_contains_timestamp` | 타임스탬프 포함 | 현재 시각 문자열 포함 |
| U-AI-03 | `test_prompt_contains_price_and_volume` | 가격/볼륨 포함 | close, volume 값 포함 |
| U-AI-04 | `test_prompt_json_format_hint` | JSON 형식 힌트 포함 | JSON 배열 형식 지시 포함 |
| U-AI-05 | `test_prompt_coin_list_constraint` | 코인 목록 제약 포함 | 허용 코인 목록 제약 문구 포함 |

#### TestCallClaude (4 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-AI-06 | `test_parses_plain_json` | 순수 JSON 파싱 | 리스트 형태 dict 반환 |
| U-AI-07 | `test_strips_markdown_code_fence` | 마크다운 코드펜스 제거 후 파싱 | 코드펜스 제거 후 정상 파싱 |
| U-AI-08 | `test_raises_on_non_array_response` | 배열 아닌 응답 → 예외 | ValueError 발생 |
| U-AI-09 | `test_raises_on_invalid_json` | 잘못된 JSON → 예외 | JSONDecodeError 발생 |

#### TestSubmitOrders (8 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-AI-10 | `test_valid_long_order_inserted` | 유효 롱 주문 삽입 | benchmark_orders에 1건 삽입 |
| U-AI-11 | `test_valid_short_order_inserted` | 유효 숏 주문 삽입 | benchmark_orders에 1건 삽입 |
| U-AI-12 | `test_invalid_long_skipped_tp_below_entry` | 롱 TP < 진입가 → 스킵 | 삽입 없음 |
| U-AI-13 | `test_invalid_short_skipped_tp_above_entry` | 숏 TP > 진입가 → 스킵 | 삽입 없음 |
| U-AI-14 | `test_unknown_coin_skipped` | 알 수 없는 코인 → 스킵 | 삽입 없음 |
| U-AI-15 | `test_multiple_orders_split_margin_equally` | 마진 균등 분배 | 각 주문 margin = balance / N |
| U-AI-16 | `test_confidence_mapping` | confidence 매핑 | 입력 confidence → order.confidence 저장 |
| U-AI-17 | `test_empty_recommendations_no_insert` | 빈 추천 → 삽입 없음 | DB 변경 없음 |

### engine.telegram_listener (`tests/test_telegram_listener.py`) — 27 TC

#### TestParseMirrolyEntry (5 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-TG-01 | `test_longing_btc` | "Longing BTC" 메시지 파싱 | side="long", coin="BTC" |
| U-TG-02 | `test_shorting_eth` | "Shorting ETH" 메시지 파싱 | side="short", coin="ETH" |
| U-TG-03 | `test_longing_without_now_prefix` | "Now longing" 접두사 없는 경우 파싱 | side="long" 정상 반환 |
| U-TG-04 | `test_shorting_case_insensitive` | 대소문자 무관 파싱 | 소문자 "shorting btc"도 파싱됨 |
| U-TG-05 | `test_unknown_coin_returns_none` | 알 수 없는 코인 → None | None 반환 |

#### TestParseMirrolyExit (4 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-TG-06 | `test_closed_btc_long` | "Closed BTC long" 메시지 파싱 | action="exit", coin="BTC", side="long" |
| U-TG-07 | `test_closed_eth_short` | "Closed ETH short" 메시지 파싱 | action="exit", coin="ETH", side="short" |
| U-TG-08 | `test_closed_no_side` | side 없는 closed 메시지 처리 | action="exit" 또는 None (구현에 따라) |
| U-TG-09 | `test_exit_preferred_over_entry_for_closed` | "closed" 포함 시 entry보다 exit 우선 | exit 시그널 반환 |

#### TestParseNoise (4 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-TG-10 | `test_none_for_empty_string` | 빈 문자열 → None | None 반환 |
| U-TG-11 | `test_none_for_plain_text` | 일반 텍스트 → None | None 반환 |
| U-TG-12 | `test_none_for_price_update` | 가격 업데이트 메시지 → None | None 반환 |
| U-TG-13 | `test_none_for_random_numbers` | 무작위 숫자 → None | None 반환 |

#### TestNormalizeCoin (5 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-TG-14 | `test_lowercase_btc` | 소문자 'btc' → 'BTC' 정규화 | "BTC" 반환 |
| U-TG-15 | `test_usdt_suffix_stripped` | 'BTCUSDT' → 'BTC' 접미사 제거 | "BTC" 반환 |
| U-TG-16 | `test_none_input_returns_none` | None 입력 → None | None 반환 |
| U-TG-17 | `test_unknown_coin_returns_none` | 알 수 없는 코인 → None | None 반환 |
| U-TG-18 | `test_pepe_passthrough` | PEPE 등 비표준 코인 통과 | "PEPE" 반환 |

#### TestHandleEntry (4 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-TG-19 | `test_entry_inserts_order` | 진입 시그널 → benchmark_orders 삽입 | DB에 주문 1건 삽입 |
| U-TG-20 | `test_entry_skipped_when_no_market_price` | 시장가 없음 → 삽입 스킵 | DB 변경 없음 |
| U-TG-21 | `test_entry_skipped_duplicate_position` | 동일 포지션 중복 → 스킵 | 추가 삽입 없음 |
| U-TG-22 | `test_entry_skipped_zero_balance` | 잔고 0 → 스킵 | DB 변경 없음 |

#### TestHandleExit (5 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| U-TG-23 | `test_exit_closes_order_and_updates_balance` | 청산 → 주문 CLOSED + 잔고 업데이트 | status=CLOSED, balance 갱신 |
| U-TG-24 | `test_exit_long_profit_pnl_positive` | 롱 수익 청산 → PnL > 0 | pnl > 0 |
| U-TG-25 | `test_exit_short_profit_pnl_positive` | 숏 수익 청산 → PnL > 0 | pnl > 0 |
| U-TG-26 | `test_exit_no_open_position_is_noop` | 열린 포지션 없음 → 아무 작업 없음 | DB 변경 없음 |
| U-TG-27 | `test_exit_skipped_when_no_market_price` | 시장가 없음 → 청산 스킵 | DB 변경 없음 |

---

## Integration Tests

### Backtest API (`tests/test_api.py`) — 13 TC

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| I-API-01 | `test_health` | /api/health 응답 | 200 OK, {"status": "ok"} |
| I-API-02 | `test_get_candles_empty` | 빈 캔들 조회 | 200 OK, 빈 배열 |
| I-API-03 | `test_get_candles_invalid_timeframe` | 잘못된 timeframe 400 | 400 Bad Request |
| I-API-04 | `test_get_candles_with_data` | 1h 캔들 + RSI 지표 | candles 배열 + rsi 필드 포함 |
| I-API-05 | `test_get_candles_1m_no_resample` | 1m 캔들 60개 | 정확히 60개 반환 |
| I-API-06 | `test_run_backtest` | 백테스트 실행 run_id 반환 | 200 OK, run_id UUID 형식 |
| I-API-07 | `test_get_summary` | summary 구조 검증 | run + aggregate 필드 포함 |
| I-API-08 | `test_get_summary_404` | 없는 run → 404 | 404 Not Found |
| I-API-09 | `test_get_coins` | coins 목록 | 코인별 summary 배열 |
| I-API-10 | `test_get_coin_trades` | trades 목록 | trades 배열 반환 |
| I-API-11 | `test_get_coin_trades_404` | 없는 run trades → 404 | 404 Not Found |
| I-API-12 | `test_full_pipeline_consistency` | summary ↔ coin ↔ trades 일관성 | 집계 수치 일치 |
| I-API-13 | `test_empty_coin_data` | 캔들 없음 → 0 trades, seed 보존 | total_trades=0, final_balance=seed |

### Benchmark API — 기존 (`tests/test_benchmark_api.py`) — 33 TC

| 그룹 | TC 수 | 검증 내용 | 예상 결과 |
|------|------|---------|---------|
| TestSubmitOrders | 17 | 주문 제출 (limit/market, 타입, 마진 분배, TP2, confidence, source 등) | 유효 주문 200, 무효 주문 400/422 |
| TestModelEndpoints | 8 | 모델 목록, 메트릭, 이름 변경, 삭제, 자동완성 | 각 CRUD 200/404 응답 |
| TestOrderEndpoints | 4 | 주문 패치 (가격, 설명, 유효성) | 유효 패치 200, 무효 400 |
| TestBatchEndpoints | 4 | 배치 조회, 삭제, 분석 업데이트 | 조회 200, 삭제 204 |

### Benchmark API — 신규 (`tests/test_benchmark_new.py`) — 24 TC

| 그룹 | TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|------|-------|---------|---------|---------|
| TestRenameModel | I-BN-01 | `test_rename_success` | 모델 이름 변경 성공 | 200 OK, 새 이름 반영 |
| | I-BN-02 | `test_rename_duplicate_name_returns_400` | 중복 이름 → 400 | 400 Bad Request |
| | I-BN-03 | `test_rename_empty_name_returns_400` | 빈 이름 → 400 | 400 Bad Request |
| | I-BN-04 | `test_rename_unknown_model_returns_404` | 없는 모델 → 404 | 404 Not Found |
| TestDeleteModel | I-BN-05 | `test_delete_model_removes_all_data` | 모델/배치/주문 전체 삭제 | 204, DB에서 전체 제거 |
| | I-BN-06 | `test_delete_unknown_model_returns_404` | 없는 모델 → 404 | 404 Not Found |
| TestPatchOrder | I-BN-07 | `test_patch_pending_entry_price` | PENDING 진입가 수정 | 200 OK, 수정된 진입가 반환 |
| | I-BN-08 | `test_patch_pending_confidence` | PENDING confidence 수정 | 200 OK, 수정된 confidence 반환 |
| | I-BN-09 | `test_patch_filled_order_description_only` | FILLED 설명만 수정 허용 | 200 OK, 설명 업데이트 |
| | I-BN-10 | `test_patch_invalid_long_tp_below_entry` | 롱 TP < 진입가 → 400 | 400 Bad Request |
| | I-BN-11 | `test_patch_unknown_order_returns_404` | 없는 주문 → 404 | 404 Not Found |
| TestPatchBatch | I-BN-12 | `test_patch_batch_market_analysis` | 배치 분석 내용 수정 | 200 OK, market_analysis 갱신 |
| | I-BN-13 | `test_patch_unknown_batch_returns_404` | 없는 배치 → 404 | 404 Not Found |
| TestDeleteBatch | I-BN-14 | `test_delete_batch_cancels_pending_orders` | PENDING 주문 취소 후 배치 삭제 | PENDING→CANCELLED, 배치 삭제 |
| | I-BN-15 | `test_delete_batch_preserves_filled_orders` | FILLED 주문 보존 | FILLED 주문 DB 유지 |
| | I-BN-16 | `test_delete_unknown_batch_returns_404` | 없는 배치 → 404 | 404 Not Found |
| TestSourceField | I-BN-17 | `test_manual_order_has_source_manual` | 수동 주문 source='manual' | source="manual" 저장 |
| | I-BN-18 | `test_orders_endpoint_returns_source_field` | 주문 목록 API에 source 필드 포함 | 응답 JSON에 source 필드 존재 |
| TestTP2Validation | I-BN-19 | `test_long_tp2_must_be_above_tp1` | 롱 TP2 ≤ TP1 → 400 | 400 Bad Request |
| | I-BN-20 | `test_short_tp2_must_be_below_tp1` | 숏 TP2 ≥ TP1 → 400 | 400 Bad Request |
| | I-BN-21 | `test_valid_long_tp2_accepted` | 유효 롱 TP2 허용 | 200 OK |
| TestMarketOrderType | I-BN-22 | `test_market_order_stored_correctly` | market 주문 타입 저장 | order_type="market" DB 저장 |
| | I-BN-23 | `test_limit_order_stored_correctly` | limit 주문 타입 저장 | order_type="limit" DB 저장 |
| TestLiveOrderValidation | I-BN-24 | `test_order_rejected_when_price_exceeds_tp` | 실시간 가격 ≥ TP → INVALID | status=INVALID, 400 반환 |

### Data API — 신규 (`tests/test_data_api_new.py`) — 14 TC

| 그룹 | TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|------|-------|---------|---------|---------|
| TestTickerEndpoint | I-DA-01 | `test_ticker_returns_price` | /api/data/ticker 가격 반환 | 200 OK, price 필드 포함 |
| | I-DA-02 | `test_ticker_returns_timestamp` | 타임스탬프 포함 | timestamp 필드 포함 |
| | I-DA-03 | `test_ticker_exchange_error_returns_500` | 거래소 오류 → 500 | 500 Internal Server Error |
| TestSymbolsEndpoint | I-DA-04 | `test_symbols_returns_list` | /api/data/symbols 목록 반환 | 코인 심볼 배열 반환 |
| TestCandlesResample | I-DA-05 | `test_5m_resampled_from_1m` | 1m → 5m 리샘플링 | 5분 캔들 배열 반환 |
| | I-DA-06 | `test_15m_resampled_from_1m` | 1m → 15m 리샘플링 | 15분 캔들 배열 반환 |
| | I-DA-07 | `test_30m_resampled_from_1m` | 1m → 30m 리샘플링 | 30분 캔들 배열 반환 |
| | I-DA-08 | `test_4h_resampled_from_1h` | 1h → 4h 리샘플링 | 4시간 캔들 배열 반환 |
| | I-DA-09 | `test_1D_resampled_from_1h` | 1h → 1D 리샘플링 | 일봉 캔들 배열 반환 |
| | I-DA-10 | `test_invalid_timeframe_returns_400` | 미지원 timeframe → 400 | 400 Bad Request |
| | I-DA-11 | `test_resample_ohlc_correctness` | OHLC 정확성 | high ≥ close ≥ low 성립 |
| TestCandlesStrategyIndicators | I-DA-12 | `test_ema_trend_indicators_present` | ema_trend 전략 지표 포함 | ema_fast, ema_slow, adx 필드 포함 |
| | I-DA-13 | `test_bb_squeeze_indicators_present` | bb_squeeze 전략 지표 포함 | bb_upper, bb_lower, bb_mid 필드 포함 |
| | I-DA-14 | `test_rsi_divergence_rsi_present` | rsi_divergence 전략 RSI 포함 | rsi 필드 포함 |

### Multi-strategy Integration (`tests/test_integration_backtest.py`) — 9 TC

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| I-INT-01 | `test_ema_strategy_accepted` | strategy="ema_trend" | 200 OK, run_id 반환 |
| I-INT-02 | `test_bb_strategy_accepted` | strategy="bb_squeeze" | 200 OK, run_id 반환 |
| I-INT-03 | `test_invalid_strategy_rejected` | strategy="unknown" | 400 Bad Request |
| I-INT-04 | `test_default_strategy_is_rsi` | strategy 미전달 | rsi_divergence로 실행 |
| I-INT-05 | `test_ema_summary_has_correct_fields` | EMA 백테스트 후 summary | run, aggregate 필드 포함 |
| I-INT-06 | `test_bb_summary_has_correct_fields` | BB 백테스트 후 summary | run, aggregate 필드 포함 |
| I-INT-07 | `test_multi_coin_backtest` | coins=["BTC","ETH"] | 두 코인 결과 각각 반환 |
| I-INT-08 | `test_stream_endpoint_emits_done` | run-stream 호출 | "done" phase 이벤트 포함 |
| I-INT-09 | `test_stream_progress_increases` | 진행률 추적 | 0 → 100 단조 증가 |

---

## E2E Tests

### Backtest E2E (`tests/test_e2e_backtest.py`) — 10 TC

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| E-BT-01 | `test_full_rsi_pipeline` | RSI 전체 파이프라인 | 모든 API 응답 정합성 |
| E-BT-02 | `test_full_ema_pipeline` | EMA 전체 파이프라인 | EMA 전략 결과 구조 정상 |
| E-BT-03 | `test_full_bb_pipeline` | BB 전체 파이프라인 | BB 전략 결과 구조 정상 |
| E-BT-04 | `test_summary_trade_count_matches_coin_sum` | summary.total_trades == Σ coin.total_trades | 집계 수치 일치 |
| E-BT-05 | `test_coin_trade_count_matches_detail` | coin.total_trades == len(trades) | 코인별 수치 일치 |
| E-BT-06 | `test_balance_monotonically_tracked` | 잔고 연속성 | balance_after = 이전 trade 잔고 |
| E-BT-07 | `test_no_overlapping_trades` | 포지션 겹침 없음 | 이전 exit_time < 현재 entry_time |
| E-BT-08 | `test_exit_reasons_are_valid` | exit_reason 유효값 | SL/TP1/TP2/BE/TIMEOUT 중 하나 |
| E-BT-09 | `test_multiple_runs_are_independent` | 복수 run 독립성 | 각각 독립된 run_id 생성 |
| E-BT-10 | `test_404_for_unknown_run` | 없는 run → 404 | 모든 하위 엔드포인트 404 |

### Benchmark E2E (`tests/test_e2e_benchmark.py`) — 10 TC

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| E-BM-01 | `test_full_order_lifecycle_limit` | limit 주문 생애주기 | PENDING→FILLED→CLOSED 전환 정상 |
| E-BM-02 | `test_full_order_lifecycle_market` | market 주문 생애주기 | 즉시 FILLED, 이후 CLOSED |
| E-BM-03 | `test_leaderboard_after_multiple_models` | 복수 모델 리더보드 | 모델별 순위 정렬 반환 |
| E-BM-04 | `test_balance_reflects_market_order_cost` | market 주문 비용 반영 | balance = seed - margin |
| E-BM-05 | `test_batch_deletion_flow` | 배치 삭제 흐름 | PENDING 취소 후 배치 제거 |
| E-BM-06 | `test_model_metrics_zero_when_no_closed` | 청산 없으면 메트릭 0 | win_rate=0, total_pnl=0 |
| E-BM-07 | `test_model_rename_then_resubmit` | 이름 변경 후 재제출 | 새 이름으로 주문 제출 성공 |
| E-BM-08 | `test_delete_model_cleans_all` | 모델 삭제 시 전체 정리 | 모델/배치/주문 모두 삭제 |
| E-BM-09 | `test_available_balance_decreases_with_orders` | 주문 시 가용 잔고 감소 | available_balance < seed |
| E-BM-10 | `test_get_model_orders_sorted_by_created` | 주문 목록 생성순 정렬 | created_at 오름차순 정렬 |

---

## TC 수 요약

| 파일 | 유형 | TC 수 |
|------|------|------|
| `test_strategy.py` | Unit | 17 |
| `test_strategy_ema.py` | Unit | 16 |
| `test_strategy_bb.py` | Unit | 15 |
| `test_risk_filters.py` | Unit | 16 |
| `test_backtester.py` | Unit | 11 |
| `test_db.py` | Unit | 12 |
| `test_benchmark_monitor.py` | Unit | 35 |
| `test_ai_trader.py` | Unit | 17 |
| `test_telegram_listener.py` | Unit | 27 |
| `test_api.py` | Integration | 13 |
| `test_benchmark_api.py` | Integration | 33 |
| `test_benchmark_new.py` | Integration | 24 |
| `test_data_api_new.py` | Integration | 14 |
| `test_integration_backtest.py` | Integration | 9 |
| `test_e2e_backtest.py` | E2E | 10 |
| `test_e2e_benchmark.py` | E2E | 10 |
| **소계** | | **289** |

---

## UI/UX Tests — Playwright (Stage 1)

### test_journey_backtest.py — 27 TC

#### TestBacktestPageLoad (6 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-BT-01 | `test_page_loads` | 백테스트 페이지 정상 로드 | HTTP 200, 페이지 타이틀 존재 |
| UX-BT-02 | `test_strategy_buttons_visible` | RSI DIV / EMA TREND / BB SQUEEZE 버튼 표시 | 3개 버튼 모두 visible |
| UX-BT-03 | `test_date_range_inputs_present` | 날짜 입력 필드 2개 존재 | input[type=date] 2개 존재 |
| UX-BT-04 | `test_run_button_present` | '백테스트 실행' 버튼 표시 | 버튼 visible |
| UX-BT-05 | `test_coin_list_visible` | BTC/ETH/SOL 코인 목록 표시 | 코인 버튼 존재 |
| UX-BT-06 | `test_no_error_on_load` | 로드 시 에러 텍스트 없음 | "error", "500" 텍스트 없음 |

#### TestBacktestStrategySelection (4 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-BT-07 | `test_click_ema_trend` | EMA TREND 클릭 후 에러 없음 | 클릭 후 페이지 정상 유지 |
| UX-BT-08 | `test_click_bb_squeeze` | BB SQUEEZE 클릭 후 에러 없음 | 클릭 후 페이지 정상 유지 |
| UX-BT-09 | `test_switch_strategy_back_to_rsi` | 전략 전환 후 RSI 재선택 | RSI 버튼 재클릭 후 에러 없음 |
| UX-BT-10 | `test_strategy_description_updates` | 전략 클릭 시 설명 텍스트 존재 | 설명 텍스트 visible |

#### TestBacktestDateInput (3 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-BT-11 | `test_start_date_accepts_value` | 시작일 입력 가능 | 입력 후 값 유지 |
| UX-BT-12 | `test_end_date_accepts_value` | 종료일 입력 가능 | 입력 후 값 유지 |
| UX-BT-13 | `test_run_button_enabled_after_date_set` | 날짜 설정 후 실행 버튼 활성화 | disabled 속성 없음 |

#### TestBacktestCoinToggle (3 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-BT-14 | `test_coin_button_clickable` | 코인 버튼 클릭 시 에러 없음 | 클릭 후 페이지 정상 유지 |
| UX-BT-15 | `test_multiple_coin_clicks` | 다중 코인 클릭 후 에러 없음 | 여러 클릭 후 페이지 정상 유지 |
| UX-BT-16 | `test_coin_deselect_reselect` | 코인 해제 후 재선택 가능 | 토글 동작 정상 |

#### TestBacktestRunButton (3 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-BT-17 | `test_run_button_not_disabled_initially` | 초기 상태 버튼 활성화 | disabled 속성 없음 |
| UX-BT-18 | `test_run_button_click_no_crash` | 버튼 클릭 후 페이지 크래시 없음 | 페이지 URL 유지 |
| UX-BT-19 | `test_run_button_shows_loading_state` | 클릭 후 로딩 상태 전환 | 로딩 인디케이터 또는 비활성화 |

#### TestHomePage (5 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-BT-20 | `test_home_page_loads` | 홈 페이지 정상 로드 | HTTP 200, 콘텐츠 존재 |
| UX-BT-21 | `test_home_hero_text_visible` | 히어로 'TRADE' 텍스트 표시 | 'TRADE' 텍스트 visible |
| UX-BT-22 | `test_home_cta_buttons_present` | 'RUN_BENCHMARK.EXE' 링크 표시 | 링크 텍스트 visible |
| UX-BT-23 | `test_home_leaderboard_section` | LEADERBOARD 섹션 표시 | 'LEADERBOARD' 텍스트 존재 |
| UX-BT-24 | `test_home_start_simulation_link` | 'START_SIMULATION' 클릭 → /backtest 이동 | URL에 /backtest 포함 |

> 참고: `test_journey_backtest.py` 에는 27개 TC 있으나 위는 주요 24개만 표기 (3개는 클래스 외 헬퍼 포함)

### test_journey_benchmark.py — 22 TC

#### TestBenchmarkOrderPage (8 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-BM-01 | `test_page_loads` | 벤치마크 페이지 정상 로드 | HTTP 200, 콘텐츠 존재 |
| UX-BM-02 | `test_model_name_input_visible` | 모델명 입력 필드 표시 | input 필드 visible |
| UX-BM-03 | `test_market_analysis_textarea_visible` | 시장 분석 텍스트에어리어 표시 | textarea visible |
| UX-BM-04 | `test_add_order_button_present` | +추가 버튼 표시 | 버튼 visible |
| UX-BM-05 | `test_submit_button_present` | 주문 제출 버튼 표시 | 버튼 visible |
| UX-BM-06 | `test_live_benchmark_nav_button` | 'Live Benchmark' 버튼 표시 | 버튼 또는 링크 visible |
| UX-BM-07 | `test_order_card_labels_visible` | 주문 카드 필드 레이블 표시 | 코인·SIDE·진입가·TP·SL 레이블 존재 |
| UX-BM-08 | `test_no_error_on_load` | 로드 시 500 에러 없음 | "500" 텍스트 없음 |

#### TestBenchmarkModelInput (3 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-BM-09 | `test_model_name_accepts_input` | 모델명 입력 가능 | 입력 후 값 유지 |
| UX-BM-10 | `test_available_balance_label_visible` | AVAILABLE_BALANCE 레이블 표시 | 레이블 텍스트 visible |
| UX-BM-11 | `test_empty_model_name_submit_shows_error` | 모델명 없이 제출 → 에러 피드백 | 에러 메시지 또는 알림 표시 |

#### TestBenchmarkOrderCard (6 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-BM-12 | `test_add_order_increases_card_count` | +추가 → ORDER 02 생성 | 카드 수 2개로 증가 |
| UX-BM-13 | `test_remove_order_removes_last_card` | × 삭제 → 마지막 카드 제거 | 카드 수 1개로 감소 |
| UX-BM-14 | `test_side_toggle_short` | SHORT 토글 동작 | SHORT 버튼 활성화 상태 |
| UX-BM-15 | `test_confidence_button_clickable` | Confidence 1~5 클릭 | 클릭 후 에러 없음 |
| UX-BM-16 | `test_clear_all_removes_orders` | 전체삭제 → 모든 카드 제거 | 카드 0개 또는 최소 1개 |
| UX-BM-17 | `test_analysis_only_changes_submit_label` | 주문 없을 때 '▶ 분석 제출' 변경 | 버튼 텍스트 '분석 제출' 포함 |

#### TestBenchmarkLeaderboard (5 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-BM-18 | `test_leaderboard_page_loads` | 리더보드 페이지 정상 로드 | HTTP 200, 콘텐츠 존재 |
| UX-BM-19 | `test_leaderboard_renders_content` | 모델 목록 또는 빈 상태 메시지 표시 | 빈 화면 아님 |
| UX-BM-20 | `test_leaderboard_no_500_error` | 500 에러 없음 | "500" 텍스트 없음 |
| UX-BM-21 | `test_leaderboard_has_rankings_when_models_exist` | 모델 있을 때 헤딩 표시 | 랭킹 관련 텍스트 visible |
| UX-BM-22 | `test_live_benchmark_button_navigates_to_leaderboard` | 버튼 클릭 → /benchmark/models 이동 | URL에 /benchmark/models 포함 |

### test_journey_error.py — 14 TC

#### TestPageAccessibility (5 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-ERR-01 | `test_home_page_accessible` | 홈 페이지 접근 가능 | HTTP 200 |
| UX-ERR-02 | `test_backtest_page_accessible` | 백테스트 페이지 접근 가능 | HTTP 200 |
| UX-ERR-03 | `test_benchmark_page_accessible` | 벤치마크 페이지 접근 가능 | HTTP 200 |
| UX-ERR-04 | `test_leaderboard_page_accessible` | 리더보드 페이지 접근 가능 | HTTP 200 |
| UX-ERR-05 | `test_404_page_not_blank` | 없는 경로 → 빈 화면 아닌 안내 표시 | 404 안내 텍스트 존재 |

#### TestInputValidationErrors (3 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-ERR-06 | `test_benchmark_empty_model_name_error` | 모델명 없이 제출 → 에러 메시지 | 에러 메시지 visible |
| UX-ERR-07 | `test_benchmark_no_stacktrace_in_error` | 에러 시 스택트레이스 미노출 | "Traceback", "at " 텍스트 없음 |
| UX-ERR-08 | `test_backtest_run_no_crash_without_coins` | 코인 해제 후 실행 → 크래시 없음 | 페이지 URL 유지 |

#### TestUXQuality (5 TC)

| TC ID | 테스트명 | 검증 내용 | 예상 결과 |
|-------|---------|---------|---------|
| UX-ERR-09 | `test_all_pages_have_nav` | 모든 페이지에 네비게이션 존재 | nav 요소 또는 네비 링크 visible |
| UX-ERR-10 | `test_pages_have_no_horizontal_overflow` | 수평 스크롤바 없음 | scrollWidth == clientWidth |
| UX-ERR-11 | `test_benchmark_submit_button_disabled_while_loading` | 제출 중 중복 클릭 방지 | 제출 후 버튼 disabled |
| UX-ERR-12 | `test_footer_visible_on_main_pages` | 주요 페이지 푸터 존재 | footer 요소 visible |
| UX-ERR-13 | `test_no_console_errors_on_load` | 심각한 JS 콘솔 에러 없음 | console.error 없음 |

---

## TC 수 요약 (v1.4)

### 백엔드 (pytest, 서버 불필요)

| 파일 | 유형 | TC 수 |
|------|------|------|
| `test_strategy.py` | Unit | 17 |
| `test_strategy_ema.py` | Unit | 16 |
| `test_strategy_bb.py` | Unit | 15 |
| `test_risk_filters.py` | Unit | 16 |
| `test_backtester.py` | Unit | 11 |
| `test_db.py` | Unit | 12 |
| `test_benchmark_monitor.py` | Unit | 35 |
| `test_ai_trader.py` | Unit | 17 |
| `test_telegram_listener.py` | Unit | 27 |
| `test_api.py` | Integration | 13 |
| `test_benchmark_api.py` | Integration | 33 |
| `test_benchmark_new.py` | Integration | 24 |
| `test_data_api_new.py` | Integration | 14 |
| `test_integration_backtest.py` | Integration | 9 |
| `test_e2e_backtest.py` | E2E | 10 |
| `test_e2e_benchmark.py` | E2E | 10 |
| **소계** | | **289** |

### UI/UX (Playwright, 실서버 필요)

| 파일 | 유형 | TC 수 |
|------|------|------|
| `e2e/test_journey_backtest.py` | UI/UX Stage 1 | 27 |
| `e2e/test_journey_benchmark.py` | UI/UX Stage 1 | 22 |
| `e2e/test_journey_error.py` | UI/UX Stage 1 | 14 |
| **소계** | | **63** |

### **총계: 352 TC**

---

## Stage 2 — Claude Vision 분석 대상

| 페이지 | URL | 체크포인트 수 |
|--------|-----|------------|
| 홈 | `/` | 5 |
| 백테스트 | `/backtest` | 5 |
| 벤치마크 | `/benchmark` | 5 |
| 리더보드 | `/benchmark/models` | 4 |

> Stage 2는 TC 개수로 집계하지 않음 (정량 기준이 아닌 AI 품질 판단)
