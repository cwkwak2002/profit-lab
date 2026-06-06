"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getBenchmarkModelNames,
  submitBenchmarkOrders,
  type OrderInput,
} from "@/lib/api";
import { PxFooter } from "@/components/px-footer";
import { PX, pxTitle, pxButtonPrimary, pxButtonSecondary } from "@/design-system/tokens/px";
import { useAuth } from "@/design-system/providers/auth-provider";

const pxPanel: React.CSSProperties = {
  background: PX.panel,
  border: `1px solid ${PX.border}`,
  borderRadius: 12,
  padding: "24px",
};

const pxLabel: React.CSSProperties = {
  display: "block",
  fontFamily: PX.fb,
  fontSize: 12,
  fontWeight: 500,
  color: PX.mid,
  letterSpacing: "0.04em",
  marginBottom: 8,
  lineHeight: 1.4,
  textTransform: "uppercase" as const,
};

const pxInput: React.CSSProperties = {
  background: PX.panel,
  border: `1px solid ${PX.border}`,
  borderRadius: 8,
  padding: "8px 12px",
  fontFamily: PX.fm,
  fontSize: 14,
  color: PX.white,
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
};


/* ── Data ───────────────────────────────────────────────────────────────── */
const TOP_COINS = [
  "BTC", "ETH", "SOL", "XRP", "DOGE",
  "AAVE", "ADA", "APT", "ARB", "AVAX", "BCH", "BNB", "CRV", "DOT", "ENA",
  "FET", "HBAR", "HYPE", "INJ", "LINK", "LTC", "NEAR", "OP", "PEPE", "RENDER",
  "SUI", "TAO", "TRX", "UNI", "WIF",
];

interface OrderRow extends OrderInput { key: string; }

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

/* ── Entry/export ────────────────────────────────────────────────────────── */
export default function BenchmarkPage() {
  return <Suspense><BenchmarkPageInner /></Suspense>;
}

/* ── Inner ───────────────────────────────────────────────────────────────── */
function BenchmarkPageInner() {
  const { guard, isAuthenticated, initialized, openLogin } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [modelName,       setModelName]       = useState(searchParams.get("model") || "");
  const [marketAnalysis,  setMarketAnalysis]  = useState("");
  const [suggestions,     setSuggestions]     = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [orders,          setOrders]          = useState<OrderRow[]>([newOrderRow()]);
  const [availableBalance,setAvailableBalance]= useState<number | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");

  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getBenchmarkModelNames().then((r) => setSuggestions(r.names)).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node))
        setShowSuggestions(false);
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

  // 주문 입력은 관리자 전용 — 비로그인 진입 시 로그인 모달 자동 표시
  useEffect(() => {
    if (initialized && !isAuthenticated) openLogin();
  }, [initialized, isAuthenticated, openLogin]);

  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(modelName.toLowerCase())
  );

  function updateOrder(key: string, field: keyof OrderInput | "key", value: string | number | null) {
    setOrders((prev) => prev.map((o) => (o.key === key ? { ...o, [field]: value } : o)));
  }

  function addOrder()           { setOrders((p) => [...p, newOrderRow()]); }
  function removeOrder(key: string) { setOrders((p) => p.length > 1 ? p.filter((o) => o.key !== key) : p); }
  function clearAllOrders()     { setOrders([]); }

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
        if (result.valid_count > 0) { alert(`${result.valid_count}건 접수 완료.\n\n${msg}`); }
        else { setError(msg); return; }
      }
      router.push(`/benchmark/models/${result.model_id}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "제출 실패"); }
    finally { setLoading(false); }
  }

  const isAnalysisOnly = orders.length === 0 && marketAnalysis.trim().length > 0;

  // 토큰 확인 전에는 폼을 렌더하지 않음 (비로그인 폼 깜빡임 방지)
  if (!initialized) return null;

  // 비로그인 상태에서는 주문 입력 폼 자체를 차단 (페이지 진입 차단)
  if (!isAuthenticated) {
    return (
      <div style={{
        flex: 1, margin: "0 -24px -24px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
        background: PX.black,
        color: PX.white, minHeight: 400,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 56, color: PX.mid }}>lock</span>
        <div style={{ fontFamily: PX.fp, fontSize: 14, color: PX.yellow, letterSpacing: 1, textAlign: "center", lineHeight: 1.8 }}>
          주문 입력은 관리자 전용입니다
        </div>
        <div style={{ fontFamily: PX.fb, fontSize: 13, color: PX.mid }}>
          계속하려면 로그인하세요.
        </div>
        <button
          onClick={openLogin}
          style={{
            fontFamily: PX.fp, fontSize: 11, letterSpacing: 1,
            padding: "12px 28px",
            border: `1px solid ${PX.cyan}`, background: "rgba(94,106,210,0.1)", color: PX.cyan,
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = PX.cyan; e.currentTarget.style.color = "#000"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(94,106,210,0.1)"; e.currentTarget.style.color = PX.cyan; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span>
          로그인
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: PX.black,
      flex: 1,
      margin: "0 -24px -24px",
      position: "relative",
      color: PX.white,
      display: "flex",
      flexDirection: "column",
    }}>

    <div style={{ maxWidth: 960, width: "100%", margin: "0 auto", padding: "32px 24px 80px", position: "relative", zIndex: 1, flex: 1 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 0, paddingBottom: 16, borderBottom: `1px solid ${PX.border}` }}>
        <div>
          <h1 style={{ ...pxTitle, marginBottom: 8 }}>
            주문 입력
          </h1>
          <p style={{ fontFamily: PX.fb, fontSize: 14, color: PX.mid, margin: 0 }}>
            AI 모델의 트레이딩 주문을 기록합니다
          </p>
        </div>
        <button
          onClick={() => router.push("/benchmark/models")}
          style={{
            fontFamily: PX.fb, fontSize: 14, fontWeight: 500,
            padding: "9px 16px",
            border: `1px solid ${PX.border}`,
            borderRadius: 8,
            background: PX.panel,
            color: PX.white,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = PX.alt; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = PX.panel; }}
        >
          Live Benchmark
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>

        {/* ── Model & Analysis ── */}
        <section style={pxPanel}>
          <div style={{ fontFamily: PX.fb, fontSize: 14, fontWeight: 600, color: PX.white, marginBottom: 20, letterSpacing: "-0.2px" }}>
            모델 & 시장 분석
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Left: Model name + balance */}
            <div>
              <div style={{ position: "relative" }} ref={suggestRef}>
                <label style={pxLabel}>AI 모델명</label>
                <input
                  type="text"
                  placeholder="모델 이름을 입력하세요"
                  value={modelName}
                  onChange={(e) => { setModelName(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  style={pxInput}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div style={{
                    position: "absolute",
                    zIndex: 50,
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: PX.panel,
                    border: `1px solid ${PX.border}`,
                    maxHeight: 160,
                    overflowY: "auto",
                  }}>
                    {filteredSuggestions.map((name) => (
                      <button
                        key={name}
                        onClick={() => { setModelName(name); setShowSuggestions(false); }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          fontFamily: PX.fb,
                          fontSize: 13,
                          color: PX.white,
                          cursor: "pointer",
                          transition: "background 0.1s ease",
                          borderBottom: `1px solid rgba(94,106,210,0.3)`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = PX.alt)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "12px 0", borderTop: `1px solid rgba(94,106,210,0.2)` }}>
                <span style={{ fontFamily: PX.fm, fontSize: 11, color: PX.mid }}>AVAILABLE_BALANCE</span>
                <span style={{ fontFamily: PX.fp, fontSize: 14, color: PX.cyan, filter: "drop-shadow(0 0 8px #00eeff)" }}>
                  {availableBalance !== null ? `$${availableBalance.toFixed(2)}` : "$--"}
                </span>
              </div>
            </div>

            {/* Right: Market analysis */}
            <div>
              <label style={pxLabel}>시장 분석</label>
              <textarea
                rows={6}
                placeholder="현재 시장 상황과 진입 근거를 작성하세요"
                value={marketAnalysis}
                onChange={(e) => setMarketAnalysis(e.target.value)}
                style={{
                  ...pxInput,
                  resize: "vertical",
                  fontFamily: PX.fb,
                  lineHeight: 1.7,
                  height: "100%",
                  minHeight: 120,
                }}
              />
            </div>
          </div>
        </section>

        {/* ── Orders header row ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: PX.alt, padding: "14px 20px",
          borderBottom: `1px solid ${PX.border}`,
        }}>
          <div style={{ fontFamily: PX.fb, fontSize: 14, fontWeight: 600, color: PX.white, letterSpacing: "-0.2px" }}>
            주문 목록 [{orders.length}]
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {orders.length > 0 && (
              <button
                onClick={clearAllOrders}
                style={{
                  fontFamily: PX.fb, fontSize: 13,
                  background: "transparent", border: "none",
                  color: PX.mid, cursor: "pointer",
                }}
              >
                전체삭제
              </button>
            )}
            <button
              onClick={addOrder}
              style={{
                fontFamily: PX.fb, fontSize: 13, fontWeight: 500,
                padding: "8px 14px",
                border: "none",
                background: PX.blue,
                color: "#fff",
                cursor: "pointer",
                borderRadius: 8,
              }}
            >
              + 추가
            </button>
          </div>
        </div>

        {/* ── Orders ── */}
        <section style={{ background: PX.panel, border: `1px solid ${PX.border}`, borderTop: "none", padding: "20px 24px" }}>

          {orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", fontFamily: PX.fb, fontSize: 13, color: PX.mid }}>
              주문 없이 시장 분석만 제출할 수 있습니다.{" "}
              <button
                onClick={addOrder}
                style={{ background: "none", border: "none", fontFamily: PX.fb, fontSize: 13, color: PX.cyan, cursor: "pointer", textDecoration: "underline" }}
              >
                주문 추가
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {orders.map((order, idx) => (
                <OrderCard
                  key={order.key}
                  order={order}
                  idx={idx}
                  onUpdate={updateOrder}
                  onRemove={removeOrder}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Error ── */}
        {error && (
          <div style={{
            background: "rgba(255,51,51,0.08)",
            border: `1px solid ${PX.red}`,
            padding: "12px 16px",
            fontFamily: PX.fb,
            fontSize: 13,
            color: PX.red,
            whiteSpace: "pre-wrap",
          }}>
            {error}
          </div>
        )}

        {/* ── Submit ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 24, paddingBottom: 32 }}>
          <div style={{ height: 1, width: "100%", background: "linear-gradient(to right, transparent, rgba(94,106,210,0.5), transparent)", marginBottom: 8 }} />
          <button
            onClick={() => guard(handleSubmit)}
            disabled={loading}
            style={{
              fontFamily: PX.fb, fontSize: 15, fontWeight: 500,
              padding: "14px 40px",
              border: "none",
              background: loading ? PX.alt : PX.blue,
              color: loading ? PX.mid : "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              borderRadius: 8,
              transition: "filter 0.15s ease",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.filter = "brightness(1.1)"; } }}
            onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.filter = "none"; } }}
          >
            {!isAuthenticated && !loading && (
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span>
            )}
            {loading ? "제출 중..." : isAnalysisOnly ? "분석 제출" : "주문 제출"}
          </button>
        </div>
      </div>
    </div>
      <PxFooter />
    </div>
  );
}

/* ── Order card ──────────────────────────────────────────────────────────── */
function OrderCard({
  order, idx, onUpdate, onRemove,
}: {
  order: OrderRow;
  idx: number;
  onUpdate: (key: string, field: keyof OrderInput | "key", value: string | number | null) => void;
  onRemove: (key: string) => void;
}) {
  const pxInput: React.CSSProperties = {
    background: "var(--px-black,#0a0a1a)",
    border: "1px solid var(--px-border,#3355ff)",
    borderRadius: 8,
    padding: "7px 10px",
    fontFamily: "var(--ff-mono,'JetBrains Mono',monospace)",
    fontSize: 13,
    color: "var(--px-white,#f0f0ff)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  };
  const pxSel: React.CSSProperties = { ...pxInput, cursor: "pointer", fontSize: 11 };
  const lbl: React.CSSProperties = {
    fontFamily: "var(--ff-pixel,'Press Start 2P',monospace)",
    fontSize: 9,
    color: "var(--px-grey-mid,#8888aa)",
    display: "block",
    marginBottom: 6,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  };

  const confColors = [
    { on: "rgba(255,51,51,0.15)", border: "var(--px-red,#ff3333)", text: "var(--px-red,#ff3333)" },
    { on: "rgba(255,51,51,0.15)", border: "var(--px-red,#ff3333)", text: "var(--px-red,#ff3333)" },
    { on: "rgba(255,224,0,0.15)", border: "var(--px-yellow,#ffe000)", text: "var(--px-yellow,#ffe000)" },
    { on: "rgba(0,255,127,0.15)", border: "var(--px-green,#00ff7f)", text: "var(--px-green,#00ff7f)" },
    { on: "rgba(0,255,127,0.15)", border: "var(--px-green,#00ff7f)", text: "var(--px-green,#00ff7f)" },
  ];

  return (
    <div style={{
      background: PX.panel,
      border: "1px solid var(--px-border,#3355ff)",
      padding: "20px 18px 16px",
      position: "relative",
    }}>
      {/* Absolute "ORDER 0N" badge */}
      <div style={{
        position: "absolute",
        top: -11,
        left: 20,
        background: "var(--px-black,#0a0a1a)",
        padding: "0 10px",
        fontFamily: "var(--ff-pixel,'Press Start 2P',monospace)",
        fontSize: 9,
        color: "var(--px-cyan,#00eeff)",
        lineHeight: 1,
      }}>
        ORDER {String(idx + 1).padStart(2, "0")}
      </div>
      {/* Remove button */}
      <button
        onClick={() => onRemove(order.key)}
        style={{
          position: "absolute",
          top: -11,
          right: 16,
          background: "var(--px-black,#0a0a1a)",
          border: "1px solid var(--px-red,#ff3333)",
          fontFamily: "var(--ff-pixel,'Press Start 2P',monospace)",
          fontSize: 9,
          color: "var(--px-red,#ff3333)",
          cursor: "pointer",
          padding: "2px 8px",
          lineHeight: 1,
        }}
        title="삭제"
      >
        × 삭제
      </button>

      {/* Row 1: core fields */}
      <div style={{ display: "grid", gridTemplateColumns: "90px 80px 80px 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={lbl}>코인</label>
          <select style={pxSel} value={order.symbol} onChange={(e) => onUpdate(order.key, "symbol", e.target.value)}>
            {["BTC","ETH","SOL","XRP","DOGE","AAVE","ADA","APT","ARB","AVAX","BCH","BNB","CRV","DOT","ENA","FET","HBAR","HYPE","INJ","LINK","LTC","NEAR","OP","PEPE","RENDER","SUI","TAO","TRX","UNI","WIF"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>SIDE</label>
          <div style={{ display: "flex", height: 36, border: "1px solid var(--px-border,#3355ff)" }}>
            <button
              onClick={() => onUpdate(order.key, "side", "long")}
              style={{
                flex: 1, border: "none", cursor: "pointer", borderRadius: 8,
                fontFamily: "var(--ff-pixel,'Press Start 2P',monospace)", fontSize: 8,
                background: order.side === "long" ? "var(--tertiary-container,#00767f)" : "var(--px-black,#0a0a1a)",
                color: order.side === "long" ? "#fff" : "var(--px-grey-mid,#8888aa)",
                transition: "all 0.1s ease",
              }}
            >LONG</button>
            <button
              onClick={() => onUpdate(order.key, "side", "short")}
              style={{
                flex: 1, border: "none", cursor: "pointer", borderRadius: 8,
                fontFamily: "var(--ff-pixel,'Press Start 2P',monospace)", fontSize: 9,
                background: order.side === "short" ? "var(--px-red,#ff3333)" : "var(--px-black,#0a0a1a)",
                color: order.side === "short" ? "#fff" : "var(--px-grey-mid,#8888aa)",
                transition: "all 0.1s ease",
              }}
            >SHORT</button>
          </div>
        </div>
        <div>
          <label style={lbl}>유형</label>
          <select style={pxSel} value={order.order_type} onChange={(e) => onUpdate(order.key, "order_type", e.target.value)}>
            <option value="limit">LIMIT</option>
            <option value="market">MARKET</option>
          </select>
        </div>
        <div>
          <label style={lbl}>{order.order_type === "market" ? "현재가" : "진입가"}</label>
          <input type="number" step="any" style={{ ...pxInput, textAlign: "right" }}
            value={order.entry_price || ""} onChange={(e) => onUpdate(order.key, "entry_price", parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label style={lbl}>TP1</label>
          <input type="number" step="any" style={{ ...pxInput, textAlign: "right", color: "var(--px-green,#00ff7f)" }}
            value={order.tp_price || ""} onChange={(e) => onUpdate(order.key, "tp_price", parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label style={lbl}>TP2</label>
          <input type="number" step="any" style={{ ...pxInput, textAlign: "right", color: "var(--px-green,#00ff7f)" }}
            placeholder="—" value={order.tp2_price ?? ""}
            onChange={(e) => { const v = e.target.value; onUpdate(order.key, "tp2_price", v ? parseFloat(v) || null : null); }} />
        </div>
        <div>
          <label style={lbl}>SL</label>
          <input type="number" step="any" style={{ ...pxInput, textAlign: "right", color: "var(--px-red,#ff3333)" }}
            value={order.sl_price || ""} onChange={(e) => onUpdate(order.key, "sl_price", parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      {/* Row 2: confidence + description */}
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10 }}>
        <div>
          <label style={lbl}>Confidence ({order.confidence}/5)</label>
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((level) => {
              const cfg = confColors[level - 1];
              const active = level <= order.confidence;
              return (
                <button
                  key={level}
                  onClick={() => onUpdate(order.key, "confidence", level)}
                  title={CONFIDENCE_LABELS[level]}
                  style={{
                    width: 32, height: 32,
                    border: `1px solid ${active ? cfg.border : "var(--px-border,#3355ff)"}`,
                    background: active ? cfg.on : "transparent",
                    color: active ? cfg.text : "var(--px-mid,#8888aa)",
                    cursor: "pointer",
                    fontFamily: "var(--ff-mono,'JetBrains Mono',monospace)",
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 8,
                    transition: "all 0.1s ease",
                  }}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label style={lbl}>근거</label>
          <textarea
            rows={3}
            placeholder="이 주문의 근거..."
            value={order.description}
            onChange={(e) => onUpdate(order.key, "description", e.target.value)}
            style={{
              background: "var(--px-black,#0a0a1a)",
              border: "1px solid var(--px-border,#3355ff)",
              borderRadius: 8,
              padding: "7px 10px",
              fontFamily: "var(--ff-body,Pretendard,sans-serif)",
              fontSize: 13,
              color: "var(--px-white,#f0f0ff)",
              outline: "none",
              width: "100%",
              resize: "vertical",
              lineHeight: 1.6,
              boxSizing: "border-box" as const,
            }}
          />
        </div>
      </div>

      {order.tp2_price !== null && order.tp2_price > 0 && (
        <div style={{ marginTop: 10, fontFamily: "var(--ff-body,Pretendard,sans-serif)", fontSize: 11, color: "var(--px-mid,#8888aa)" }}>
          TP1 도달 시 50% 청산, SL 본절 이동 → TP2 또는 본절 SL까지 나머지 50% 유지
        </div>
      )}
    </div>
  );
}
