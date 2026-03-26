"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { PxPixelDeco } from "@/components/px-pixel-deco";
import { PX } from "@/design-system/tokens/px";
import { TableCell, TableRow } from "@/components/ui/table";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BenchmarkChart, type BenchmarkChartHandle } from "@/components/benchmark-chart";
import { ResizableSplit } from "@/components/resizable-split";
import {
  getBenchmarkModel,
  getBenchmarkOrders,
  getBenchmarkBatches,
  updateBenchmarkOrder,
  updateBenchmarkBatch,
  deleteBenchmarkBatch,
  renameBenchmarkModel,
  deleteBenchmarkModel,
  subscribeBenchmarkStream,
  type BenchmarkModel,
  type BenchmarkOrder,
  type BenchmarkBatch,
} from "@/lib/api";


const TOP_COINS = [
  "BTC", "ETH", "SOL", "XRP", "DOGE",
  "AAVE", "ADA", "APT", "ARB", "AVAX", "BCH", "BNB", "CRV", "DOT", "ENA",
  "FET", "HBAR", "HYPE", "INJ", "LINK", "LTC", "NEAR", "OP", "PEPE", "RENDER",
  "SUI", "TAO", "TRX", "UNI", "WIF",
];

// --- Helpers ---

function statusBadge(status: string) {
  const cfg: Record<string, { color: string; bg: string }> = {
    PENDING:   { color: PX.yellow, bg: "rgba(255,224,0,0.1)" },
    FILLED:    { color: PX.cyan,   bg: "rgba(0,238,255,0.1)" },
    CLOSED:    { color: PX.mid,    bg: "rgba(136,136,170,0.1)" },
    CANCELLED: { color: PX.red,    bg: "rgba(255,51,51,0.1)" },
    INVALID:   { color: PX.pink,   bg: "rgba(255,45,120,0.1)" },
  };
  const c = cfg[status] || cfg.CLOSED;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 6px",
      border: `1px solid ${c.color}`,
      background: c.bg,
      fontFamily: PX.fm, fontSize: 9, color: c.color,
      letterSpacing: "0.04em",
    }}>
      {status}
    </span>
  );
}

function reasonBadge(reason: string | null) {
  if (!reason) return null;
  const colors: Record<string, string> = {
    TP: PX.green, TP2: PX.green, SL: PX.red,
    SL_BE: PX.yellow, TIMEOUT_6H: PX.yellow,
    CANCEL_30M: PX.mid, MANUAL: PX.mid,
  };
  const labels: Record<string, string> = {
    TP: "TP", TP2: "TP2", SL: "SL", SL_BE: "SL(BE)",
    TIMEOUT_6H: "6H", CANCEL_30M: "30m", MANUAL: "삭제",
  };
  return (
    <span style={{ fontFamily: PX.fm, fontSize: 9, color: colors[reason] || PX.mid }}>
      {labels[reason] || reason}
    </span>
  );
}

function confidenceDots(level: number) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{
          width: 6, height: 6,
          background: i <= level
            ? (level <= 2 ? PX.red : level <= 3 ? PX.yellow : PX.green)
            : "rgba(136,136,170,0.2)",
        }} />
      ))}
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

function StatItem({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{
      padding: "10px 12px",
      borderLeft: `3px solid ${color || PX.border}`,
      background: "rgba(51,85,255,0.05)",
      marginBottom: 4,
    }}>
      <div style={{ fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.06em", marginBottom: 6, textTransform: "uppercase" as const }}>
        {label}
      </div>
      <div style={{ fontFamily: PX.fm, fontSize: 14, fontWeight: 700, color: color || PX.white, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: PX.fb, fontSize: 10, color: PX.mid, marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}

// --- Editable analysis ---

function EditableAnalysis({ batch, onSave }: { batch: BenchmarkBatch; onSave: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(batch.market_analysis);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try { await updateBenchmarkBatch(batch.id, text); setEditing(false); onSave(); }
    catch { /* ignore */ }
    finally { setSaving(false); }
  }

  if (!editing) {
    return (
      <div
        onClick={() => { setEditing(true); setText(batch.market_analysis); }}
        title="클릭하여 수정"
        style={{
          background: "rgba(51,85,255,0.06)",
          border: `1px solid rgba(51,85,255,0.3)`,
          padding: "12px 14px",
          cursor: "pointer",
          position: "relative",
        }}
      >
        {batch.market_analysis ? (
          <div className="markdown-body" style={{ fontSize: 13, color: PX.white, fontFamily: PX.fb, lineHeight: 1.7 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{batch.market_analysis}</ReactMarkdown>
          </div>
        ) : (
          <span style={{ fontFamily: PX.fb, fontSize: 13, color: PX.dim, fontStyle: "italic" }}>시장 분석 없음</span>
        )}
        <span style={{
          position: "absolute", top: 6, right: 10,
          fontFamily: PX.fp, fontSize: 8, color: PX.mid,
          opacity: 0,
        }}
          className="edit-hint"
        >수정</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea
        style={{
          width: "100%", padding: "10px 12px",
          background: PX.panel, border: `1px solid ${PX.border}`,
          color: PX.white, fontFamily: PX.fb, fontSize: 12,
          resize: "vertical", outline: "none",
        }}
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSave} disabled={saving}
          style={{
            padding: "6px 14px", fontFamily: PX.fp, fontSize: 9,
            background: saving ? PX.dim : PX.cyan, color: "#000",
            border: "none", cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={() => setEditing(false)}
          style={{
            padding: "6px 14px", fontFamily: PX.fp, fontSize: 9,
            background: "transparent", color: PX.mid,
            border: `1px solid ${PX.mid}`, cursor: "pointer",
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

// --- Order row (inline edit) ---

function EditableOrderRow({
  order, onSave, onClickSymbol, onClickAnalysis,
}: {
  order: BenchmarkOrder;
  onSave: () => void;
  onClickSymbol: (order: BenchmarkOrder) => void;
  onClickAnalysis: (batchId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<BenchmarkOrder>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isPending = order.status === "PENDING";

  function startEdit() {
    setDraft({
      symbol: order.symbol, side: order.side, order_type: order.order_type,
      entry_price: order.entry_price, tp_price: order.tp_price, tp2_price: order.tp2_price,
      sl_price: order.sl_price, confidence: order.confidence, description: order.description,
    });
    setEditing(true);
    setError("");
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (draft.description !== undefined && draft.description !== order.description) updates.description = draft.description;
      if (isPending) {
        if (draft.symbol && draft.symbol !== order.symbol) updates.symbol = draft.symbol;
        if (draft.side && draft.side !== order.side) updates.side = draft.side;
        if (draft.order_type && draft.order_type !== order.order_type) updates.order_type = draft.order_type;
        if (draft.entry_price && draft.entry_price !== order.entry_price) updates.entry_price = draft.entry_price;
        if (draft.tp_price && draft.tp_price !== order.tp_price) updates.tp_price = draft.tp_price;
        if (draft.sl_price && draft.sl_price !== order.sl_price) updates.sl_price = draft.sl_price;
        if (draft.confidence && draft.confidence !== order.confidence) updates.confidence = draft.confidence;
        if (draft.tp2_price !== undefined && draft.tp2_price !== order.tp2_price) updates.tp2_price = draft.tp2_price;
      }
      if (Object.keys(updates).length === 0) { setEditing(false); return; }
      await updateBenchmarkOrder(order.id, updates);
      setEditing(false);
      onSave();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "수정 실패"); }
    finally { setSaving(false); }
  }

  const td: React.CSSProperties = {
    padding: "9px 10px",
    fontFamily: PX.fm, fontSize: 13,
    borderBottom: "1px solid rgba(51,85,255,0.15)",
    color: PX.white,
  };
  const tdMid: React.CSSProperties = { ...td, color: PX.mid };

  if (!editing) {
    return (
      <TableRow
        className="group"
        style={{ cursor: "pointer", transition: "background 0.1s steps(1)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(51,85,255,0.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <TableCell style={tdMid}>
          <div style={{ fontFamily: PX.fm, fontSize: 10 }} title={`주문: ${order.created_at}`}>{formatTime(order.created_at)}</div>
          {order.fill_time && <div style={{ fontFamily: PX.fm, fontSize: 10, color: PX.cyan }} title={`체결: ${order.fill_time}`}>{formatTime(order.fill_time)}</div>}
          {order.close_time && <div style={{ fontFamily: PX.fm, fontSize: 10, color: PX.dim }} title={`청산: ${order.close_time}`}>{formatTime(order.close_time)}</div>}
        </TableCell>
        <TableCell style={td}>{statusBadge(order.status)}</TableCell>
        <TableCell style={td}>
          <span style={{ fontFamily: PX.fm, fontSize: 10, color: order.order_type === "market" ? PX.yellow : PX.mid }}>
            {order.order_type.toUpperCase()}
          </span>
        </TableCell>
        <TableCell style={td}>
          <button style={{ fontFamily: PX.fm, fontSize: 11, color: PX.cyan, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            onClick={() => onClickSymbol(order)} title="차트에서 보기">
            {order.symbol}
          </button>
        </TableCell>
        <TableCell style={td}>
          <span style={{ fontFamily: PX.fm, fontSize: 11, fontWeight: 700, color: order.side === "long" ? PX.green : PX.red }}>
            {order.side.toUpperCase()}
          </span>
        </TableCell>
        <TableCell style={{ ...td, textAlign: "center" }}>{confidenceDots(order.confidence)}</TableCell>
        <TableCell style={{ ...td, textAlign: "right" }}>
          <div>{order.entry_price.toLocaleString()}</div>
          {order.fill_time && <div style={{ fontSize: 9, color: PX.dim }}>@ {order.entry_price.toLocaleString()}</div>}
        </TableCell>
        <TableCell style={{ ...td, textAlign: "right" }}>
          <div>{order.tp_price.toLocaleString()}{order.tp1_hit ? <span style={{ color: PX.green }}>✓</span> : null}</div>
          {order.close_price !== null && (order.close_reason === "TP" || order.close_reason === "TP2") && <div style={{ fontSize: 9, color: PX.green }}>@ {order.close_price.toLocaleString()}</div>}
        </TableCell>
        <TableCell style={{ ...td, textAlign: "right" }}>
          <div>{order.tp2_price ? order.tp2_price.toLocaleString() : "-"}</div>
          {order.close_price !== null && order.close_reason === "TP2" && order.tp2_price && <div style={{ fontSize: 9, color: PX.green }}>@ {order.close_price.toLocaleString()}</div>}
        </TableCell>
        <TableCell style={{ ...td, textAlign: "right" }}>
          <div>{order.sl_price.toLocaleString()}</div>
          {order.close_price !== null && (order.close_reason === "SL" || order.close_reason === "SL_BE") && <div style={{ fontSize: 9, color: PX.red }}>@ {order.close_price.toLocaleString()}</div>}
          {order.close_price !== null && order.close_reason === "TIMEOUT_6H" && <div style={{ fontSize: 9, color: PX.yellow }}>@ {order.close_price.toLocaleString()}</div>}
        </TableCell>
        <TableCell style={{ ...tdMid, textAlign: "right" }}>${order.margin.toFixed(2)}</TableCell>
        <TableCell style={{
          ...td, textAlign: "right", fontWeight: 700,
          color: order.pnl !== null ? (order.pnl > 0 ? PX.green : order.pnl < 0 ? PX.red : PX.mid) : PX.mid,
        }}>
          {order.pnl !== null ? `${order.pnl > 0 ? "+" : ""}${order.pnl.toFixed(2)}` : order.tp1_pnl !== null ? <span style={{ color: PX.yellow }}>+{order.tp1_pnl.toFixed(2)}</span> : "-"}
        </TableCell>
        <TableCell style={td}>{reasonBadge(order.close_reason)}</TableCell>
        <TableCell style={{ ...tdMid, textAlign: "right" }}>
          {order.balance_after !== null ? `$${order.balance_after.toFixed(2)}` : "-"}
        </TableCell>
        <TableCell style={td}>
          <button style={{ fontFamily: PX.fm, fontSize: 10, color: PX.cyan, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            onClick={() => onClickAnalysis(order.batch_id)}>분석</button>
        </TableCell>
        <TableCell style={{ ...tdMid, maxWidth: 160 }}>
          <div style={{ whiteSpace: "pre-wrap", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{order.description || "-"}</div>
        </TableCell>
        <TableCell style={td}>
          <button
            style={{ fontFamily: PX.fp, fontSize: 8, color: PX.dim, background: "none", border: "none", cursor: "pointer", opacity: 0 }}
            className="group-hover:opacity-100-btn"
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = PX.cyan; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; e.currentTarget.style.color = PX.dim; }}
            onClick={startEdit} title={isPending ? "주문 수정" : "근거 수정"}>수정</button>
        </TableCell>
      </TableRow>
    );
  }

  // Editing mode
  return (
    <>
      <TableRow style={{ background: "rgba(51,85,255,0.08)" }}>
        <TableCell style={{ ...td, color: PX.mid, whiteSpace: "nowrap" }}>
          <div style={{ fontFamily: PX.fm, fontSize: 10 }}>{formatTime(order.created_at)}</div>
        </TableCell>
        <TableCell style={td}>{statusBadge(order.status)}</TableCell>
        <TableCell style={td}>
          {isPending ? (
            <select style={{ background: PX.panel, border: `1px solid ${PX.border}`, color: PX.white, padding: "2px 4px", fontSize: 11, fontFamily: PX.fm }}
              value={draft.order_type || "limit"} onChange={(e) => setDraft({ ...draft, order_type: e.target.value as "limit" | "market" })}>
              <option value="limit">LIMIT</option><option value="market">MARKET</option>
            </select>
          ) : <span style={{ fontFamily: PX.fm }}>{order.order_type.toUpperCase()}</span>}
        </TableCell>
        <TableCell style={td}>
          {isPending ? (
            <select style={{ background: PX.panel, border: `1px solid ${PX.border}`, color: PX.white, padding: "2px 4px", fontSize: 11, fontFamily: PX.fm }}
              value={draft.symbol || order.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })}>
              {TOP_COINS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : <span style={{ fontFamily: PX.fm }}>{order.symbol}</span>}
        </TableCell>
        <TableCell style={td}>
          {isPending ? (
            <select style={{ background: PX.panel, border: `1px solid ${PX.border}`, color: PX.white, padding: "2px 4px", fontSize: 11, fontFamily: PX.fm }}
              value={draft.side || order.side} onChange={(e) => setDraft({ ...draft, side: e.target.value as "long" | "short" })}>
              <option value="long">Long</option><option value="short">Short</option>
            </select>
          ) : <span style={{ color: order.side === "long" ? PX.green : PX.red, fontFamily: PX.fm }}>{order.side.toUpperCase()}</span>}
        </TableCell>
        <TableCell style={td}>
          {isPending ? (
            <div style={{ display: "flex", gap: 2 }}>{[1,2,3,4,5].map((l) => (
              <button key={l}
                style={{ width: 18, height: 18, fontFamily: PX.fm, fontSize: 10, cursor: "pointer", border: `1px solid ${l <= (draft.confidence || 3) ? PX.cyan : PX.dim}`, background: l <= (draft.confidence || 3) ? "rgba(0,238,255,0.15)" : "transparent", color: l <= (draft.confidence || 3) ? PX.cyan : PX.mid }}
                onClick={() => setDraft({ ...draft, confidence: l })}>{l}</button>
            ))}</div>
          ) : confidenceDots(order.confidence)}
        </TableCell>
        <TableCell style={td}>{isPending ? <input type="number" step="any" style={{ width: "100%", background: PX.panel, border: `1px solid ${PX.border}`, color: PX.white, padding: "2px 4px", fontSize: 11, fontFamily: PX.fm, textAlign: "right" }} value={draft.entry_price || ""} onChange={(e) => setDraft({ ...draft, entry_price: parseFloat(e.target.value) || 0 })} /> : <span style={{ fontFamily: PX.fm }}>{order.entry_price.toLocaleString()}</span>}</TableCell>
        <TableCell style={td}>{isPending ? <input type="number" step="any" style={{ width: "100%", background: PX.panel, border: `1px solid ${PX.border}`, color: PX.white, padding: "2px 4px", fontSize: 11, fontFamily: PX.fm, textAlign: "right" }} value={draft.tp_price || ""} onChange={(e) => setDraft({ ...draft, tp_price: parseFloat(e.target.value) || 0 })} /> : <span style={{ fontFamily: PX.fm }}>{order.tp_price.toLocaleString()}</span>}</TableCell>
        <TableCell style={td}>{isPending ? <input type="number" step="any" style={{ width: "100%", background: PX.panel, border: `1px solid ${PX.border}`, color: PX.white, padding: "2px 4px", fontSize: 11, fontFamily: PX.fm, textAlign: "right" }} placeholder="-" value={draft.tp2_price ?? ""} onChange={(e) => setDraft({ ...draft, tp2_price: e.target.value ? parseFloat(e.target.value) || null : null })} /> : <span style={{ fontFamily: PX.fm }}>{order.tp2_price ? order.tp2_price.toLocaleString() : "-"}</span>}</TableCell>
        <TableCell style={td}>{isPending ? <input type="number" step="any" style={{ width: "100%", background: PX.panel, border: `1px solid ${PX.border}`, color: PX.white, padding: "2px 4px", fontSize: 11, fontFamily: PX.fm, textAlign: "right" }} value={draft.sl_price || ""} onChange={(e) => setDraft({ ...draft, sl_price: parseFloat(e.target.value) || 0 })} /> : <span style={{ fontFamily: PX.fm }}>{order.sl_price.toLocaleString()}</span>}</TableCell>
        <TableCell style={{ ...tdMid, textAlign: "right" }}>${order.margin.toFixed(2)}</TableCell>
        <TableCell style={{ ...tdMid, textAlign: "right" }}>-</TableCell>
        <TableCell style={td}>{reasonBadge(order.close_reason)}</TableCell>
        <TableCell style={{ ...tdMid, textAlign: "right" }}>
          {order.balance_after !== null ? `$${order.balance_after.toFixed(2)}` : "-"}
        </TableCell>
        <TableCell style={td}></TableCell>
        <TableCell style={td}>
          <textarea style={{ width: "100%", background: PX.panel, border: `1px solid ${PX.border}`, color: PX.white, padding: "4px 6px", fontSize: 11, fontFamily: PX.fb, resize: "vertical" }} rows={3} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </TableCell>
        <TableCell style={td}>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ fontFamily: PX.fp, fontSize: 9, color: PX.cyan, background: "none", border: "none", cursor: "pointer" }} onClick={handleSave} disabled={saving}>{saving ? "..." : "저장"}</button>
            <button style={{ fontFamily: PX.fp, fontSize: 8, color: PX.mid, background: "none", border: "none", cursor: "pointer" }} onClick={() => setEditing(false)}>취소</button>
          </div>
        </TableCell>
      </TableRow>
      {error && <TableRow><TableCell colSpan={16} style={{ fontFamily: PX.fb, fontSize: 11, color: PX.red, padding: "6px 10px" }}>{error}</TableCell></TableRow>}
    </>
  );
}


// --- Main page ---

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = params.modelId as string;

  const [model, setModel] = useState<BenchmarkModel | null>(null);
  const [orders, setOrders] = useState<BenchmarkOrder[]>([]);
  const [batches, setBatches] = useState<BenchmarkBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameError, setRenameError] = useState("");

  // Chart state
  const [chartTab, setChartTab] = useState<"equity" | "chart">("chart");
  const [chartCoin, setChartCoin] = useState<string | null>(null);
  const chartRef = useRef<BenchmarkChartHandle>(null);
  const initialCoinSet = useRef(false);

  // Bottom tab state
  const [bottomTab, setBottomTab] = useState<"orders" | "analyses">("orders");
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const batchRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadData();
    const es = subscribeBenchmarkStream((event) => {
      const ev = event as { model_id?: string };
      if (ev.model_id === modelId) loadData();
    });
    return () => es.close();
  }, [modelId]);

  async function loadData() {
    try {
      const [m, o, b] = await Promise.all([
        getBenchmarkModel(modelId),
        getBenchmarkOrders(modelId),
        getBenchmarkBatches(modelId),
      ]);
      setModel(m);
      setOrders(o.orders);
      setBatches(b.batches);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const orderCoins = [...new Set(orders.map((o) => o.symbol))];

  useEffect(() => {
    if (initialCoinSet.current || orders.length === 0) return;
    const sorted = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
    setChartCoin(sorted[0].symbol);
    initialCoinSet.current = true;
  }, [orders]);

  const chartCoinOrders = chartCoin ? orders.filter((o) => o.symbol === chartCoin) : [];

  function handleClickSymbol(order: BenchmarkOrder) {
    const targetTime = order.fill_time || order.created_at;
    const timeSeconds = new Date(targetTime).getTime() / 1000;
    if (order.symbol !== chartCoin) {
      setChartCoin(order.symbol);
      setChartTab("chart");
    }
    chartRef.current?.scrollToTime(timeSeconds);
  }

  function handleClickAnalysis(batchId: string) {
    setBottomTab("analyses");
    setExpandedBatch(batchId);
    setTimeout(() => {
      const el = batchRefs.current.get(batchId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  async function handleRename() {
    if (!newName.trim()) return;
    setRenameError("");
    try { await renameBenchmarkModel(modelId, newName.trim()); setRenaming(false); loadData(); }
    catch (e: unknown) { setRenameError(e instanceof Error ? e.message : "이름 변경 실패"); }
  }

  async function handleDeleteModel() {
    if (!confirm(`모델 "${model?.name}"을(를) 삭제하시겠습니까?\n모든 주문과 배치가 영구 삭제됩니다.`)) return;
    try { await deleteBenchmarkModel(modelId); router.push("/benchmark/models"); } catch { /* ignore */ }
  }

  async function handleDeleteBatch(batchId: string) {
    if (!confirm("이 배치를 삭제하시겠습니까? PENDING 주문은 취소됩니다.")) return;
    try { await deleteBenchmarkBatch(batchId); loadData(); } catch { /* ignore */ }
  }

  if (loading) return (
    <div style={{ textAlign: "center", padding: "80px 0", fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.08em" }}>
      LOADING...
    </div>
  );
  if (!model) return (
    <div style={{ textAlign: "center", padding: "80px 0", fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.08em" }}>
      MODEL NOT FOUND
    </div>
  );

  const returnPct = ((model.balance - model.seed) / model.seed) * 100;
  const sortedOrders = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const sortedBatches = [...batches].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const ordersByBatch = new Map<string, BenchmarkOrder[]>();
  for (const o of orders) {
    const list = ordersByBatch.get(o.batch_id) || [];
    list.push(o);
    ordersByBatch.set(o.batch_id, list);
  }

  /* ── Table header cell ── */
  function TH({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
    return (
      <th style={{
        fontFamily: PX.fp, fontSize: 10, color: PX.mid, letterSpacing: "0.06em",
        padding: "10px 10px", textAlign: align, fontWeight: "normal",
        borderBottom: `2px solid ${PX.border}`, whiteSpace: "nowrap" as const,
        background: PX.alt,
      }}>
        {children}
      </th>
    );
  }

  return (
    <div className="px-page" style={{
      margin: "0 -24px -24px",
      height: "calc(100vh - 110px)",
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(135deg, #05051e 0%, #1a0b2e 50%, #0c0c1d 100%)",
      color: "var(--px-white, #f0f0ff)",
      overflow: "hidden",
      position: "relative",
    }}>
      <style>{`
        .px-page *::-webkit-scrollbar { width: 4px; height: 4px; }
        .px-page *::-webkit-scrollbar-track { background: #0c0c1e; }
        .px-page *::-webkit-scrollbar-thumb { background: #2a3560; border-radius: 0; }
        .px-page *::-webkit-scrollbar-thumb:hover { background: #3a4880; }
        .px-page *::-webkit-scrollbar-corner { background: #0c0c1e; }
        .px-page * { scrollbar-width: thin; scrollbar-color: #2a3560 #0c0c1e; }
      `}</style>

      {/* ── Header bar ── */}
      <div style={{
        flexShrink: 0, padding: "10px 20px",
        borderBottom: `2px solid ${PX.border}`,
        background: PX.alt,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: `0 2px 0 rgba(51,85,255,0.3)`,
      }}>
        {/* Left: back + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <PxPixelDeco variant="brain" size={36} />
          <button
            onClick={() => router.push("/benchmark/models")}
            style={{
              fontFamily: PX.fp, fontSize: 9, color: PX.cyan,
              background: "transparent", border: "none",
              padding: "4px 0", cursor: "pointer",
              letterSpacing: "0.06em",
              transition: "color 0.1s steps(1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = PX.white; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = PX.cyan; }}
          >
            ← Live Benchmark
          </button>

          <div style={{ width: 1, height: 20, background: PX.border }} />

          {renaming ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="text"
                style={{ background: PX.panel, border: `1px solid ${PX.border}`, color: PX.white, padding: "5px 10px", fontFamily: PX.fb, fontSize: 14, outline: "none" }}
                value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
                autoFocus
              />
              <button onClick={handleRename} style={{ fontFamily: PX.fp, fontSize: 9, padding: "5px 12px", background: PX.cyan, color: "#000", border: "none", cursor: "pointer" }}>저장</button>
              <button onClick={() => setRenaming(false)} style={{ fontFamily: PX.fp, fontSize: 9, padding: "5px 12px", background: "transparent", color: PX.mid, border: `1px solid ${PX.mid}`, cursor: "pointer" }}>취소</button>
              {renameError && <span style={{ fontFamily: PX.fb, fontSize: 11, color: PX.red }}>{renameError}</span>}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontFamily: PX.fp, fontSize: 10, color: PX.yellow, letterSpacing: 1, margin: 0, textShadow: "1px 1px 0 #886600" }}>
                {model.name}
              </h1>
              <button
                onClick={() => { setNewName(model.name); setRenaming(true); setRenameError(""); }}
                style={{ fontFamily: PX.fp, fontSize: 8, color: PX.dim, background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = PX.mid; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = PX.dim; }}
              >
                이름 변경
              </button>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => router.push(`/benchmark?model=${encodeURIComponent(model?.name || "")}`)}
            style={{
              fontFamily: PX.fb, fontSize: 13,
              padding: "7px 16px",
              border: `2px solid ${PX.cyan}`,
              background: "rgba(0,238,255,0.1)", color: PX.cyan,
              cursor: "pointer",
              transition: "all 0.1s steps(1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = PX.cyan; e.currentTarget.style.color = "#000"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,238,255,0.1)"; e.currentTarget.style.color = PX.cyan; }}
          >
            + 주문 입력
          </button>
          <button
            onClick={handleDeleteModel}
            style={{ fontFamily: PX.fp, fontSize: 8, color: PX.dim, background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = PX.red; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = PX.dim; }}
          >
            삭제
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left sidebar */}
        <aside style={{
          width: 180, flexShrink: 0,
          borderRight: `2px solid ${PX.border}`,
          background: "#0e0e22",
          overflowY: "auto",
          padding: "12px 10px",
        }}>
          <StatItem label="잔액" value={`$${model.balance.toFixed(2)}`} color={PX.cyan} />
          <StatItem label="수익률"
            value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`}
            color={returnPct >= 0 ? PX.green : PX.red}
            sub={`P&L: $${model.cumulative_pnl.toFixed(2)}`} />
          <StatItem label="승률" value={`${model.win_rate.toFixed(1)}%`} sub={`${model.closed_orders}건 청산`} />
          <StatItem label="MDD" value={`${model.mdd.toFixed(1)}%`} color={PX.yellow} />
          <StatItem label="Profit Factor" value={model.profit_factor !== null ? model.profit_factor.toFixed(2) : "-"} />
          <StatItem label="가용 잔액" value={`$${model.available_balance.toFixed(2)}`} sub={`마진: $${model.active_margin.toFixed(2)}`} color={PX.mid} />

          {/* Coin navigation */}
          {orderCoins.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${PX.border}` }}>
              <div style={{ fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.06em", marginBottom: 8, textTransform: "uppercase" as const }}>
                코인 목록
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {orderCoins.map((coin) => {
                  const count = orders.filter((o) => o.symbol === coin).length;
                  const active = chartCoin === coin;
                  return (
                    <button key={coin}
                      onClick={() => { setChartCoin(coin); setChartTab("chart"); }}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "7px 10px", cursor: "pointer",
                        background: active ? "rgba(0,238,255,0.1)" : "transparent",
                        border: active ? `1px solid ${PX.cyan}` : "1px solid transparent",
                        color: active ? PX.cyan : PX.mid,
                        fontFamily: PX.fm, fontSize: 11,
                        transition: "all 0.1s steps(1)",
                      }}
                      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = PX.white; e.currentTarget.style.borderColor = PX.dim; } }}
                      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = PX.mid; e.currentTarget.style.borderColor = "transparent"; } }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600 }}>{coin}</span>
                        <span style={{ fontSize: 10, color: PX.dim }}>{count}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Right content */}
        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <ResizableSplit
            top={
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Chart tab bar */}
                <div style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
                  padding: "8px 14px",
                  borderBottom: `2px solid ${PX.border}`,
                  background: PX.alt,
                }}>
                  {(["chart", "equity"] as const).map((tab) => {
                    const label = tab === "chart" ? "차트" : "수익 곡선";
                    const active = chartTab === tab;
                    return (
                      <button key={tab}
                        onClick={() => setChartTab(tab)}
                        style={{
                          padding: "5px 14px", cursor: "pointer",
                          fontFamily: PX.fp, fontSize: 9, letterSpacing: "0.04em",
                          background: active ? PX.border : "transparent",
                          color: active ? PX.white : PX.mid,
                          border: active ? "none" : `1px solid transparent`,
                          transition: "all 0.1s steps(1)",
                        }}
                        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = PX.white; e.currentTarget.style.borderColor = PX.dim; } }}
                        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = PX.mid; e.currentTarget.style.borderColor = "transparent"; } }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Chart content */}
                <div style={{ flex: 1, overflow: "hidden", position: "relative", background: "#0a0a18" }}>
                  {chartTab === "equity" ? (
                    orders.filter((o) => o.status === "CLOSED").length > 0 ? (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                        <EquityCurve seed={model.seed} closedOrders={orders.filter((o) => o.status === "CLOSED")} />
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.08em" }}>
                        청산된 주문 없음
                      </div>
                    )
                  ) : (
                    chartCoin ? (
                      <BenchmarkChart ref={chartRef} symbol={chartCoin} orders={chartCoinOrders} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.08em" }}>
                        좌측에서 코인 선택
                      </div>
                    )
                  )}
                </div>
              </div>
            }
            bottom={
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Bottom tab bar */}
                <div style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 0,
                  borderBottom: `2px solid ${PX.border}`,
                  background: PX.alt,
                }}>
                  {([
                    { key: "orders", label: `주문 내역`, count: orders.length },
                    { key: "analyses", label: `시장 분석`, count: batches.length },
                  ] as const).map(({ key, label, count }) => {
                    const active = bottomTab === key;
                    return (
                      <button key={key}
                        onClick={() => setBottomTab(key)}
                        style={{
                          padding: "10px 20px", cursor: "pointer",
                          fontFamily: PX.fp, fontSize: 9, letterSpacing: "0.04em",
                          background: active ? PX.border : "transparent",
                          color: active ? PX.white : PX.mid,
                          border: "none",
                          borderRight: `1px solid ${PX.border}`,
                          transition: "all 0.1s steps(1)",
                        }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = PX.white; }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = PX.mid; }}
                      >
                        {label} <span style={{ color: active ? "rgba(255,255,255,0.6)" : PX.dim, marginLeft: 6 }}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {bottomTab === "orders" ? (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <TH>시간</TH>
                          <TH>상태</TH>
                          <TH>유형</TH>
                          <TH>코인</TH>
                          <TH>방향</TH>
                          <TH align="right">확신</TH>
                          <TH align="right">진입가</TH>
                          <TH align="right">TP1</TH>
                          <TH align="right">TP2</TH>
                          <TH align="right">SL</TH>
                          <TH align="right">마진</TH>
                          <TH align="right">P&amp;L</TH>
                          <TH>사유</TH>
                          <TH align="right">잔액</TH>
                          <TH>분석</TH>
                          <TH>근거</TH>
                          <TH></TH>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedOrders.map((o) => (
                          <EditableOrderRow key={o.id} order={o} onSave={loadData}
                            onClickSymbol={handleClickSymbol} onClickAnalysis={handleClickAnalysis} />
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div>
                      {sortedBatches.map((batch) => {
                        const isExpanded = expandedBatch === batch.id;
                        const batchOrders = ordersByBatch.get(batch.id) || [];
                        const orderCount = batchOrders.length;
                        const isAnalysisOnly = orderCount === 0;
                        const hasPending = batchOrders.some((o) => o.status === "PENDING");
                        const allTerminal = batchOrders.every((o) => o.status === "CLOSED" || o.status === "CANCELLED");
                        const firstLine = batch.market_analysis
                          ? batch.market_analysis.split("\n")[0].slice(0, 80) + (batch.market_analysis.length > 80 ? "..." : "")
                          : "(분석 없음)";

                        return (
                          <div key={batch.id} ref={(el) => { if (el) batchRefs.current.set(batch.id, el); }}
                            style={{ borderBottom: `1px solid rgba(51,85,255,0.2)` }}>
                            {/* Collapsed header */}
                            <div
                              onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                              style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "10px 16px", cursor: "pointer",
                                transition: "background 0.1s steps(1)",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(51,85,255,0.08)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              <span style={{ fontFamily: PX.fp, fontSize: 8, color: PX.cyan, display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.1s" }}>▶</span>
                              <span style={{ fontFamily: PX.fm, fontSize: 11, color: PX.dim }}>#{batch.id.slice(0, 8)}</span>
                              <span style={{ fontFamily: PX.fm, fontSize: 12, color: PX.mid }}>{formatTime(batch.created_at)}</span>
                              {isAnalysisOnly ? (
                                <span style={{ fontFamily: PX.fp, fontSize: 8, padding: "2px 8px", border: `1px solid ${PX.dim}`, color: PX.mid }}>분석만</span>
                              ) : (
                                <span style={{ fontFamily: PX.fm, fontSize: 12, color: PX.dim }}>{orderCount}건</span>
                              )}
                              <span style={{ fontFamily: PX.fb, fontSize: 13, color: PX.white, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{firstLine}</span>

                              {(isAnalysisOnly || hasPending || allTerminal) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.id); }}
                                  style={{ fontFamily: PX.fp, fontSize: 8, color: PX.dim, background: "none", border: "none", cursor: "pointer" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = PX.red; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = PX.dim; }}
                                >삭제</button>
                              )}
                            </div>

                            {/* Expanded */}
                            {isExpanded && (
                              <div style={{ padding: "8px 16px 16px" }}>
                                <EditableAnalysis batch={batch} onSave={loadData} />
                                {orderCount > 0 && (
                                  <div style={{ marginTop: 10, fontFamily: PX.fb, fontSize: 13, color: PX.mid, display: "flex", flexWrap: "wrap" as const, gap: 6, alignItems: "center" }}>
                                    <span style={{ fontFamily: PX.fp, fontSize: 8, marginRight: 8, color: PX.mid, textTransform: "uppercase" as const }}>주문:</span>
                                    {batchOrders.map((o) => (
                                      <span key={o.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        <span style={{ color: o.side === "long" ? PX.green : PX.red, fontFamily: PX.fm, fontSize: 12, fontWeight: 700 }}>{o.side.toUpperCase()}</span>
                                        <span style={{ fontFamily: PX.fm, fontSize: 12, color: PX.white }}>{o.symbol}</span>
                                        <span style={{ color: PX.mid, fontFamily: PX.fm, fontSize: 11 }}>@{o.entry_price.toLocaleString()}</span>
                                        {o.pnl !== null && <span style={{ color: o.pnl > 0 ? PX.green : PX.red, fontFamily: PX.fm, fontSize: 11 }}>({o.pnl > 0 ? "+" : ""}{o.pnl.toFixed(2)})</span>}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {sortedBatches.length === 0 && (
                        <div style={{ textAlign: "center", padding: "40px 0", fontFamily: PX.fp, fontSize: 8, color: PX.mid, letterSpacing: "0.08em" }}>
                          분석 없음
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            }
          />
        </main>
      </div>
    </div>
  );
}


function EquityCurve({ seed, closedOrders }: { seed: number; closedOrders: BenchmarkOrder[] }) {
  const sorted = [...closedOrders].sort(
    (a, b) => new Date(a.close_time!).getTime() - new Date(b.close_time!).getTime()
  );
  const balances = [seed];
  for (const o of sorted) {
    if (o.balance_after !== null) balances.push(o.balance_after);
  }
  if (balances.length < 2) return null;

  const w = 700, h = 200, pad = 30;
  const min = Math.min(...balances) * 0.98;
  const max = Math.max(...balances) * 1.02;
  const points = balances.map((b, i) => {
    const x = pad + (i / (balances.length - 1)) * (w - 2 * pad);
    const y = pad + ((max - b) / (max - min)) * (h - 2 * pad);
    return `${x},${y}`;
  });
  const seedY = pad + ((max - seed) / (max - min)) * (h - 2 * pad);
  const lastPt = points[points.length - 1].split(",");
  const areaPoints = [...points, `${parseFloat(lastPt[0])},${h - pad}`, `${pad},${h - pad}`].join(" ");
  const lastBalance = balances[balances.length - 1];
  const lineColor = lastBalance >= seed ? "#00ff7f" : "#ff3333";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxHeight: 200 }}>
      <defs>
        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#equityGrad)" />
      <line x1={pad} y1={seedY} x2={w - pad} y2={seedY} stroke="rgba(136,136,170,0.4)" strokeWidth="1" strokeDasharray="4,4" />
      <polyline points={points.join(" ")} fill="none" stroke={lineColor} strokeWidth="1.5" />
      <circle cx={parseFloat(lastPt[0])} cy={parseFloat(lastPt[1])} r="3" fill={lineColor} />
    </svg>
  );
}
