"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const DEFAULT_COINS = ALL_COINS.slice(0, 5); // BTC, ETH, SOL, XRP, DOGE

export default function BacktestPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-03-21");
  const [selectedCoins, setSelectedCoins] = useState<string[]>(DEFAULT_COINS);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState(false);

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
        { coins: selectedCoins, start_date: startDate, end_date: endDate },
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">RSI 다이버전스 백테스트</h2>

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
            <div>
              <h4 className="font-semibold mb-1">진입 조건 (1H 봉)</h4>
              <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                <li>현재 종가 &lt; 직전 50개 캔들 최저가 (Price Lower Low)</li>
                <li>현재 RSI(14) &gt; 직전 저점 RSI (RSI Higher Low → 상승 다이버전스)</li>
                <li>직전 저점 RSI &lt; 30 (30선 하향 돌파 후 회복 확인)</li>
                <li>신호 캔들 저가 ≤ 볼린저 밴드 하단 (BB 20, 2σ)</li>
                <li>신호 캔들이 망치형 (Hammer) 패턴 — 하락 거부 꼬리</li>
                <li>조건 확정된 봉 마감 직후, 다음 봉 시가에 진입</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">청산 규칙 (1m 봉)</h4>
              <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                <li><span className="text-red-500 font-medium">SL</span> — 신호 캔들 저가 - 0.5% 도달 시 전량 청산</li>
                <li><span className="text-blue-500 font-medium">TP1</span> — RSI ≥ 70 또는 +2% → 50% 청산</li>
                <li><span className="font-medium">BE</span> — TP1 체결 즉시, 잔여 50% 손절가를 진입가로 이동</li>
                <li><span className="text-green-500 font-medium">TP2</span> — +5% → 전량 청산</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">실행 조건</h4>
              <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                <li>코인별 초기 시드 $100 · 레버리지 10x · 전액 투입 · 복리</li>
                <li>수수료 Taker 0.04% (진입/청산 각각) · 슬리피지 0.05%</li>
                <li>동일 캔들 내 SL/TP 동시 터치 시 Low → High 순서 판별</li>
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
