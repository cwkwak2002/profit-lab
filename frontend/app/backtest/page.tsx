"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { syncData, runBacktest } from "@/lib/api";

const ALL_COINS = [
  "BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "MATIC",
  "UNI", "ATOM", "FIL", "LTC", "NEAR", "APT", "ARB", "OP", "SUI", "SEI",
  "INJ", "TIA", "JUP", "WIF", "PEPE", "BONK", "RENDER", "FET", "TAO", "AAVE",
  "MKR", "CRV", "LDO", "RUNE", "STX", "IMX", "MANTA", "DYM", "STRK", "PYTH",
  "JTO", "W", "ENA", "ETHFI", "ONDO", "PENDLE", "WLD", "BLUR", "ORDI", "TRX",
];

export default function BacktestPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-03-21");
  const [selectedCoins, setSelectedCoins] = useState<string[]>(ALL_COINS);
  const [status, setStatus] = useState<string>("");
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
    try {
      // Step 1: Sync data
      setStatus("데이터 동기화 중...");
      const syncResult = await syncData({
        coins: selectedCoins,
        start_date: startDate,
        end_date: endDate,
      });

      const errorCount = Object.keys(syncResult.errors).length;
      if (errorCount > 0) {
        setStatus(`동기화 완료 (에러 ${errorCount}건). 백테스트 실행 중...`);
      } else {
        setStatus("동기화 완료. 백테스트 실행 중...");
      }

      // Step 2: Run backtest
      const result = await runBacktest({
        coins: selectedCoins,
        start_date: startDate,
        end_date: endDate,
      });

      setStatus("완료!");
      router.push(`/backtest/${result.run_id}`);
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
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
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

      <div className="flex items-center gap-4">
        <Button onClick={handleRun} disabled={loading} size="lg">
          {loading ? "실행 중..." : "백테스트 실행"}
        </Button>
        {status && (
          <span className="text-sm text-muted-foreground">{status}</span>
        )}
      </div>
    </div>
  );
}
