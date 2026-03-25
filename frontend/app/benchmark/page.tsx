"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getBenchmarkModelNames,
  submitBenchmarkOrders,
  type OrderInput,
} from "@/lib/api";

const TOP_COINS = [
  "BTC", "ETH", "SOL", "XRP", "DOGE",
  "AAVE", "ADA", "APT", "ARB", "AVAX", "BCH", "BNB", "CRV", "DOT", "ENA",
  "FET", "HBAR", "HYPE", "INJ", "LINK", "LTC", "NEAR", "OP", "PEPE", "RENDER",
  "SUI", "TAO", "TRX", "UNI", "WIF",
];

interface OrderRow extends OrderInput {
  key: string;
}

function newOrderRow(): OrderRow {
  return {
    key: Math.random().toString(36).slice(2) + Date.now().toString(36),
    symbol: "BTC",
    side: "long",
    entry_price: 0,
    tp_price: 0,
    sl_price: 0,
    description: "",
    order_type: "limit",
    confidence: 3,
    tp2_price: null,
  };
}

const CONFIDENCE_LABELS = ["", "Very Low", "Low", "Medium", "High", "Very High"];

function InputLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">{children}</label>;
}

export default function BenchmarkPage() {
  return (
    <Suspense>
      <BenchmarkPageInner />
    </Suspense>
  );
}

function BenchmarkPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modelName, setModelName] = useState(searchParams.get("model") || "");
  const [marketAnalysis, setMarketAnalysis] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([newOrderRow()]);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getBenchmarkModelNames().then((r) => setSuggestions(r.names)).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!modelName.trim()) { setAvailableBalance(null); return; }
    const timer = setTimeout(async () => {
      try {
        const { models } = await (await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/benchmark/models`
        )).json();
        const found = models.find((m: { name: string }) => m.name === modelName.trim());
        setAvailableBalance(found ? found.available_balance : 100.0);
      } catch { setAvailableBalance(null); }
    }, 300);
    return () => clearTimeout(timer);
  }, [modelName]);

  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(modelName.toLowerCase())
  );

  function updateOrder(key: string, field: keyof OrderInput | "key", value: string | number | null) {
    setOrders((prev) => prev.map((o) => (o.key === key ? { ...o, [field]: value } : o)));
  }

  function addOrder() { setOrders((prev) => [...prev, newOrderRow()]); }
  function removeOrder(key: string) { setOrders((prev) => (prev.length > 1 ? prev.filter((o) => o.key !== key) : prev)); }
  function clearAllOrders() { setOrders([]); }

  function validateOrder(o: OrderRow, idx: number): string | null {
    if (o.entry_price <= 0 || o.tp_price <= 0 || o.sl_price <= 0)
      return `주문 ${idx + 1}: 가격은 0보다 커야 합니다`;
    if (o.side === "long") {
      if (o.tp_price <= o.entry_price) return `주문 ${idx + 1}: Long TP는 진입가보다 높아야 합니다`;
      if (o.sl_price >= o.entry_price) return `주문 ${idx + 1}: Long SL은 진입가보다 낮아야 합니다`;
      if (o.tp2_price !== null && o.tp2_price <= o.tp_price) return `주문 ${idx + 1}: Long TP2는 TP1보다 높아야 합니다`;
    } else {
      if (o.tp_price >= o.entry_price) return `주문 ${idx + 1}: Short TP는 진입가보다 낮아야 합니다`;
      if (o.sl_price <= o.entry_price) return `주문 ${idx + 1}: Short SL은 진입가보다 높아야 합니다`;
      if (o.tp2_price !== null && o.tp2_price >= o.tp_price) return `주문 ${idx + 1}: Short TP2는 TP1보다 낮아야 합니다`;
    }
    return null;
  }

  async function handleSubmit() {
    setError("");
    if (!modelName.trim()) { setError("모델 이름을 입력하세요"); return; }
    if (orders.length === 0 && !marketAnalysis.trim()) { setError("주문 또는 시장 분석이 필요합니다"); return; }
    for (let i = 0; i < orders.length; i++) {
      const err = validateOrder(orders[i], i);
      if (err) { setError(err); return; }
    }
    setLoading(true);
    try {
      const result = await submitBenchmarkOrders({
        model_name: modelName.trim(),
        market_analysis: marketAnalysis.trim(),
        orders: orders.map(({ symbol, side, entry_price, tp_price, sl_price, description, order_type, confidence, tp2_price }) => ({
          symbol, side, entry_price, tp_price, sl_price, description, order_type, confidence, tp2_price,
        })),
      });
      if (result.invalid_count > 0) {
        const msg = `${result.invalid_count}건 무효 (현재가 기준 TP/SL 즉시 도달):\n${result.invalid_orders.join("\n")}`;
        if (result.valid_count > 0) {
          alert(`${result.valid_count}건 접수 완료.\n\n${msg}`);
        } else {
          setError(msg);
          return;
        }
      }
      router.push(`/benchmark/models/${result.model_id}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "제출 실패"); }
    finally { setLoading(false); }
  }

  const isAnalysisOnly = orders.length === 0 && marketAnalysis.trim().length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">주문 입력</h1>
          <p className="text-sm text-muted-foreground mt-1">AI 모델의 트레이딩 주문을 기록합니다</p>
        </div>
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => router.push("/benchmark/models")}>
          리더보드 보기
        </button>
      </div>

      {/* Model & Market Analysis section */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">모델 & 시장 분석</h2>

        <div className="flex items-start gap-6">
          <div className="relative flex-1 max-w-sm" ref={suggestRef}>
            <InputLabel>모델 이름</InputLabel>
            <input
              type="text"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
              placeholder="예: GPT-4o-trader"
              value={modelName}
              onChange={(e) => { setModelName(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.map((name) => (
                  <button key={name} className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                    onClick={() => { setModelName(name); setShowSuggestions(false); }}>
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {availableBalance !== null && (
            <div className="pt-6">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">가용 잔액</span>
              <div className="text-xl font-semibold font-mono tabular-nums text-primary mt-0.5">
                ${availableBalance.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        <div>
          <InputLabel>시장 분석 (전체 주문에 적용)</InputLabel>
          <textarea
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm resize-y placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            rows={10}
            placeholder="현재 시장 상황, 매매 근거, 전반적인 관점 등을 기록하세요..."
            value={marketAnalysis}
            onChange={(e) => setMarketAnalysis(e.target.value)}
          />
        </div>
      </section>

      {/* Orders section */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            주문 목록 <span className="text-foreground ml-1">{orders.length}</span>
          </h2>
          <div className="flex gap-2">
            {orders.length > 0 && (
              <button className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border hover:border-border/80 transition-colors" onClick={clearAllOrders}>
                전체 삭제
              </button>
            )}
            <button className="text-xs text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-md transition-colors" onClick={addOrder}>
              + 주문 추가
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            주문 없이 시장 분석만 제출할 수 있습니다.
            <button className="ml-2 text-primary hover:underline" onClick={addOrder}>주문 추가</button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, idx) => (
              <div key={order.key} className="rounded-lg border border-border/60 bg-background/50 p-4 space-y-3 group/card hover:border-border transition-colors">
                {/* Row 1: core fields */}
                <div className="grid grid-cols-[90px_80px_80px_1fr_1fr_1fr_1fr_32px] gap-3 items-end">
                  <div>
                    <InputLabel>코인</InputLabel>
                    <select className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm focus:border-primary/50 focus:outline-none transition-colors" value={order.symbol} onChange={(e) => updateOrder(order.key, "symbol", e.target.value)}>
                      {TOP_COINS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <InputLabel>방향</InputLabel>
                    <select className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm focus:border-primary/50 focus:outline-none transition-colors" value={order.side} onChange={(e) => updateOrder(order.key, "side", e.target.value)}>
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                  <div>
                    <InputLabel>유형</InputLabel>
                    <select className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm focus:border-primary/50 focus:outline-none transition-colors" value={order.order_type} onChange={(e) => updateOrder(order.key, "order_type", e.target.value)}>
                      <option value="limit">Limit</option>
                      <option value="market">Market</option>
                    </select>
                  </div>
                  <div>
                    <InputLabel>{order.order_type === "market" ? "현재가" : "진입가"}</InputLabel>
                    <input type="number" step="any" className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-right font-mono focus:border-primary/50 focus:outline-none transition-colors" value={order.entry_price || ""} onChange={(e) => updateOrder(order.key, "entry_price", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <InputLabel>TP1</InputLabel>
                    <input type="number" step="any" className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-right font-mono focus:border-primary/50 focus:outline-none transition-colors" value={order.tp_price || ""} onChange={(e) => updateOrder(order.key, "tp_price", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <InputLabel>TP2 (선택)</InputLabel>
                    <input type="number" step="any" className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-right font-mono placeholder:text-muted-foreground/30 focus:border-primary/50 focus:outline-none transition-colors" placeholder="-" value={order.tp2_price ?? ""} onChange={(e) => { const v = e.target.value; updateOrder(order.key, "tp2_price", v ? parseFloat(v) || null : null); }} />
                  </div>
                  <div>
                    <InputLabel>SL</InputLabel>
                    <input type="number" step="any" className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-right font-mono focus:border-primary/50 focus:outline-none transition-colors" value={order.sl_price || ""} onChange={(e) => updateOrder(order.key, "sl_price", parseFloat(e.target.value) || 0)} />
                  </div>
                  <button className="text-muted-foreground hover:text-destructive pb-2 text-lg opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => removeOrder(order.key)} title="삭제">&times;</button>
                </div>

                {/* Row 2: confidence + description */}
                <div className="grid grid-cols-[180px_1fr] gap-3 items-end">
                  <div>
                    <InputLabel>Confidence ({order.confidence}/5)</InputLabel>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <button key={level}
                          className={`w-8 h-8 rounded-md text-xs font-mono border transition-all ${
                            level <= order.confidence
                              ? level <= 2 ? "bg-red-500/15 border-red-500/40 text-red-400"
                              : level <= 3 ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                            : "bg-background border-border text-muted-foreground hover:border-border/80"
                          }`}
                          onClick={() => updateOrder(order.key, "confidence", level)} title={CONFIDENCE_LABELS[level]}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <InputLabel>근거</InputLabel>
                    <textarea className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm resize-y placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors" rows={3} placeholder="이 주문의 근거..." value={order.description} onChange={(e) => updateOrder(order.key, "description", e.target.value)} />
                  </div>
                </div>

                {order.tp2_price !== null && order.tp2_price > 0 && (
                  <div className="text-xs text-muted-foreground/70 pl-1">
                    TP1 도달 시 50% 청산, SL 본절 이동 → TP2 또는 본절 SL까지 나머지 50% 유지
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button className="px-6" onClick={handleSubmit} disabled={loading}>
          {loading ? "제출 중..." : isAnalysisOnly ? "분석 제출" : "주문 제출"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/benchmark/models")}>
          리더보드 보기
        </Button>
      </div>
    </div>
  );
}
