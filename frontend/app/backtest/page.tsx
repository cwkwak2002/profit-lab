"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runBacktestStream, type ProgressEvent } from "@/lib/api";

const ALL_COINS = [
  "BTC", "ETH", "SOL", "XRP", "DOGE", "ZEC", "RIVER", "BNB", "1000PEPE", "HYPE",
  "PIPPIN", "SUI", "ADA", "BCH", "AVAX", "LINK", "AXS", "ASTER", "DASH", "TAO",
  "PUMP", "FIL", "POWER", "LTC", "ENA", "BEAT", "ENSO", "DOT", "TRUMP", "NEAR",
  "SIREN", "UNI", "XMR", "FARTCOIN", "AAVE", "WLFI", "BERA", "WIF", "WLD", "IP",
  "LIGHT", "XPL", "DUSK", "BULLA", "PENGU", "1000BONK", "1000SHIB", "ZKP", "SENT", "ARB",
];

const DEFAULT_COINS = ALL_COINS.slice(0, 5);

const STRATEGIES = [
  { id: "rsi_divergence", name: "RSI Divergence", desc: "RSI 상승 다이버전스 + BB 회귀 + W-Pattern 확인 후 반전 매수 (Long Only)" },
  { id: "ema_trend", name: "EMA Trend", desc: "1H EMA 정배열/역배열 추세 확인 후 15m 눌림목/반등 진입 (Long & Short)" },
  { id: "bb_squeeze", name: "BB Squeeze", desc: "볼린저 밴드 응축 후 거래량 동반 돌파 시 브레이크아웃 진입 (Long & Short)" },
] as const;

function BacktestPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStrategy = searchParams.get("strategy") || "rsi_divergence";

  const [strategy, setStrategy] = useState(initialStrategy);
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-03-21");
  const [selectedCoins, setSelectedCoins] = useState<string[]>(DEFAULT_COINS);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Restore from sessionStorage on mount
  useEffect(() => {
    const s = sessionStorage.getItem("bt_strategy");
    const sd = sessionStorage.getItem("bt_startDate");
    const ed = sessionStorage.getItem("bt_endDate");
    const c = sessionStorage.getItem("bt_coins");
    if (s) setStrategy(s);
    if (sd) setStartDate(sd);
    if (ed) setEndDate(ed);
    if (c) {
      try { setSelectedCoins(JSON.parse(c)); } catch { /* ignore */ }
    }
  }, []);

  // Persist selections to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("bt_strategy", strategy);
    sessionStorage.setItem("bt_startDate", startDate);
    sessionStorage.setItem("bt_endDate", endDate);
    sessionStorage.setItem("bt_coins", JSON.stringify(selectedCoins));
  }, [strategy, startDate, endDate, selectedCoins]);

  const toggleCoin = (coin: string) => {
    setSelectedCoins((prev) =>
      prev.includes(coin) ? prev.filter((c) => c !== coin) : [...prev, coin]
    );
  };

  const selectAll = () => setSelectedCoins([...ALL_COINS]);
  const deselectAll = () => setSelectedCoins([]);

  const handleRun = async () => {
    if (selectedCoins.length === 0) {
      setStatus("코인을 1개 이상 선택해주세요.");
      return;
    }

    setLoading(true);
    setProgress(0);
    setStatus("시작 중...");

    try {
      const runId = await runBacktestStream(
        { coins: selectedCoins, start_date: startDate, end_date: endDate, strategy },
        (event: ProgressEvent) => {
          setProgress(event.progress);
          setStatus(event.message);
        },
      );
      router.push(`/backtest/${runId}`);
    } catch (err) {
      setStatus(`오류: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const strategyName = STRATEGIES.find((s) => s.id === strategy)?.name ?? strategy;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">{strategyName} 백테스트</h2>

      {/* Strategy selector */}
      <div className="flex gap-2">
        {STRATEGIES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStrategy(s.id)}
            className={`px-4 py-2 text-sm rounded-md border transition-colors ${
              strategy === s.id
                ? "bg-[#1f6feb] text-white border-[#1f6feb]"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground -mt-2">
        {STRATEGIES.find((s) => s.id === strategy)?.desc}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>기간 설정</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-border rounded px-3 py-2 text-sm bg-[#0d1117] text-foreground"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-border rounded px-3 py-2 text-sm bg-[#0d1117] text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>코인 선택 ({selectedCoins.length}/{ALL_COINS.length})</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>전체 선택</Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>전체 해제</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ALL_COINS.map((coin) => (
              <button
                key={coin}
                onClick={() => toggleCoin(coin)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  selectedCoins.includes(coin)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {coin}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors select-none">
          전략 상세 규칙 보기
        </summary>
        <Card className="mt-2">
          <CardContent className="pt-4 text-sm space-y-4">
            {strategy === "rsi_divergence" ? (
              <>
                <div>
                  <h4 className="font-semibold mb-1">진입 조건 — 4중 필터 (1H 봉)</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    <li><span className="font-medium">RSI 상승 다이버전스</span> — 가격 Lower Low + RSI Higher Low (최소 하나 RSI &lt; 30)</li>
                    <li><span className="font-medium">BB 회귀</span> — BB(20, 2σ) 하단 터치/이탈 후 밴드 내부 복귀 종가</li>
                    <li><span className="font-medium">RSI W-Pattern</span> — RSI 30 미만 → 30선 상향 재돌파 (과매도 탈출 확정)</li>
                    <li><span className="font-medium">캔들 반전</span> — 망치형(Hammer) 또는 상승 장악형 양봉 (직전 음봉 50%+ 커버)</li>
                    <li>조건 확정된 봉 마감 직후, 다음 봉 시가에 진입</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">위험 회피 필터</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    <li>5분 내 3%+ 급변 → 60분 쿨다운 (변동성 폭발)</li>
                    <li>RSI 30 이하 10봉+ 연속 → 진입 금지 (RSI 침수)</li>
                    <li>BTC 1H -5%+ 급락 시 → 알트코인 Long 금지 (BTC 가드)</li>
                    <li>가격이 1H 200 EMA 대비 -10% 이상 이격 → 진입 금지 (데드 존)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">청산 규칙 (1m 봉)</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    <li><span className="text-[#f85149] font-medium">SL</span> — 다이버전스 최근 저가 - 0.5%</li>
                    <li><span className="text-[#58a6ff] font-medium">TP1 (50%)</span> — RSI ≥ 70 또는 손익비 1.5배 도달 → 본절로스 이동</li>
                    <li><span className="text-[#3fb950] font-medium">TP2 (50%)</span> — 15m 200 EMA 터치 시 전량 청산</li>
                  </ul>
                </div>
              </>
            ) : strategy === "ema_trend" ? (
              <>
                <div>
                  <h4 className="font-semibold mb-1">추세 확인 (1H 봉)</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    <li><span className="text-[#3fb950] font-medium">Long</span> — 50 EMA &gt; 200 EMA 정배열 (골든크로스)</li>
                    <li><span className="text-[#f85149] font-medium">Short</span> — 50 EMA &lt; 200 EMA 역배열 (데드크로스)</li>
                    <li>ADX(14) ≥ 25 — 추세 강도 확인</li>
                    <li>No-Trade Zone: ADX &lt; 20 또는 50/200 EMA 간격 &lt; 0.5% (Whipsaw)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">진입 조건 (15m 봉)</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    <li><span className="text-[#3fb950] font-medium">Long</span> — 15m 가격이 50 EMA로 눌림목 형성 후 재돌파</li>
                    <li><span className="text-[#f85149] font-medium">Short</span> — 15m 가격이 50 EMA 위로 반등 후 재이탈</li>
                    <li>현재 거래량 &gt; 최근 20봉 평균 거래량</li>
                    <li>다음 봉 시가에 진입</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">청산 규칙</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    <li><span className="text-[#f85149] font-medium">SL</span> — 15m 200 EMA 이탈 (동적 추적)</li>
                    <li><span className="text-[#58a6ff] font-medium">TP1 (Long)</span> — 손익비 1:2 지점 → 50% 청산</li>
                    <li><span className="text-[#58a6ff] font-medium">TP1 (Short)</span> — 손익비 1:1.5 지점 → 50% 청산</li>
                    <li><span className="font-medium">BE</span> — TP1 체결 즉시, 잔여 50% 손절가를 진입가로 이동</li>
                    <li><span className="text-[#3fb950] font-medium">EMA Cross</span> — 15m EMA 역크로스 시 전량 청산</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">위험 회피 필터</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    <li>1H 50/200 EMA 간격 &lt; 0.5% → 진입 금지</li>
                    <li>15m 캔들 종가가 50 EMA와 200 EMA 사이에 갇힌 경우 → 진입 금지</li>
                    <li>1H ADX(14) &lt; 20 → 진입 금지</li>
                    <li>5분 내 3%+ 급등/급락 발생 → 해당 심볼 60분 쿨다운</li>
                    <li>BTC 1H 수익률 -5% 이하 → 알트코인 Long 진입 금지</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h4 className="font-semibold mb-1">스퀘즈 확인 (15m 봉)</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    <li>BB Width(20, 2σ)가 최근 100봉 중 하위 20% = 응축 구간</li>
                    <li>스퀘즈 상태가 최소 15봉 이상 지속된 후의 돌파만 유효</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">진입 조건 (15m 봉)</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    <li><span className="text-[#3fb950] font-medium">Long</span> — 종가 &gt; BB 상단 + 거래량 ≥ 평균의 200% + 하단 밴드 하락 확인</li>
                    <li><span className="text-[#f85149] font-medium">Short</span> — 종가 &lt; BB 하단 + 거래량 ≥ 평균의 250%</li>
                    <li>다음 봉 시가에 진입</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">청산 규칙 (1m 봉)</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    <li><span className="text-[#f85149] font-medium">SL</span> — BB 중심선 (20 SMA) 터치 시 전량 청산</li>
                    <li><span className="text-[#a371f7] font-medium">Long TRAIL</span> — 수익 발생 후 밴드 안쪽 복귀 시 트레일링 스탑 (고점 -1% 또는 중심선)</li>
                    <li><span className="text-[#3fb950] font-medium">Short TP</span> — 고정 수익률 +3.5% 도달 시 즉시 청산</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">위험 회피 필터</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    <li>1H 50/200 EMA 간격 &lt; 0.5% → 진입 금지</li>
                    <li>15m 캔들 종가가 50 EMA와 200 EMA 사이에 갇힌 경우 → 진입 금지</li>
                    <li>1H ADX(14) &lt; 20 → 진입 금지</li>
                    <li>BB 상단 돌파 시 하단 밴드 기울기가 양수 → Long 진입 금지</li>
                    <li>5분 내 3%+ 급등/급락 발생 → 해당 심볼 60분 쿨다운</li>
                    <li>BTC 1H 수익률 -5% 이하 → 알트코인 Long 진입 금지</li>
                  </ul>
                </div>
              </>
            )}
            <div>
              <h4 className="font-semibold mb-1">실행 조건</h4>
              <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                <li>코인별 초기 시드 $100 · 레버리지 10x · 전액 투입 · 복리</li>
                <li>수수료 Taker 0.04% (진입/청산 각각) · 슬리피지 0.05%</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </details>

      <div className="space-y-3">
        <Button onClick={handleRun} disabled={loading} size="lg">
          {loading ? "실행 중..." : "백테스트 실행"}
        </Button>

        {loading && (
          <div className="space-y-2">
            <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1f6feb] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{status}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {!loading && status && (
          <span className="text-sm text-muted-foreground">{status}</span>
        )}
      </div>
    </div>
  );
}

export default function BacktestPage() {
  return (
    <Suspense>
      <BacktestPageInner />
    </Suspense>
  );
}
