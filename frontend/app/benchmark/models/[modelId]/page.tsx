"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const styles: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    FILLED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    CLOSED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
    INVALID: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${styles[status] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
      {status}
    </span>
  );
}

function reasonBadge(reason: string | null) {
  if (!reason) return null;
  const colors: Record<string, string> = {
    TP: "text-emerald-400", TP2: "text-emerald-400", SL: "text-red-400",
    SL_BE: "text-amber-400", TIMEOUT_6H: "text-amber-400",
    CANCEL_30M: "text-muted-foreground", MANUAL: "text-muted-foreground",
  };
  const labels: Record<string, string> = {
    TP: "TP", TP2: "TP2", SL: "SL", SL_BE: "SL(BE)",
    TIMEOUT_6H: "6H", CANCEL_30M: "30m 취소", MANUAL: "삭제",
  };
  return <span className={`text-[10px] font-mono font-medium ${colors[reason] || ""}`}>{labels[reason] || reason}</span>;
}

function confidenceDots(level: number) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${
          i <= level ? (level <= 2 ? "bg-red-400" : level <= 3 ? "bg-amber-400" : "bg-emerald-400") : "bg-muted-foreground/20"
        }`} />
      ))}
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

function StatItem({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <span className={`text-lg font-semibold font-mono tabular-nums leading-tight ${color || "text-foreground"}`}>{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
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
        className="rounded-lg bg-accent/30 border border-border/40 px-4 py-3 text-sm cursor-pointer hover:border-border/60 group relative transition-colors"
        onClick={() => { setEditing(true); setText(batch.market_analysis); }}
        title="클릭하여 수정"
      >
        {batch.market_analysis ? (
          <div className="markdown-body max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{batch.market_analysis}</ReactMarkdown>
          </div>
        ) : (
          <span className="text-muted-foreground italic">시장 분석 없음</span>
        )}
        <span className="absolute top-2 right-3 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">수정</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm resize-y focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>취소</Button>
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

  if (!editing) {
    return (
      <TableRow className="group text-xs border-border/30 hover:bg-accent/30 transition-colors">
        <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
          <div className="text-[10px] font-mono" title={`주문: ${order.created_at}`}>{formatTime(order.created_at)}</div>
          {order.fill_time && <div className="text-[10px] font-mono text-blue-400/70" title={`체결: ${order.fill_time}`}>{formatTime(order.fill_time)}</div>}
          {order.close_time && <div className="text-[10px] font-mono text-zinc-400/70" title={`청산: ${order.close_time}`}>{formatTime(order.close_time)}</div>}
        </TableCell>
        <TableCell className="py-2">{statusBadge(order.status)}</TableCell>
        <TableCell className="py-2">
          <span className={`font-mono text-[10px] ${order.order_type === "market" ? "text-amber-400" : "text-muted-foreground"}`}>
            {order.order_type.toUpperCase()}
          </span>
        </TableCell>
        <TableCell className="py-2">
          <button className="font-mono text-primary hover:underline" onClick={() => onClickSymbol(order)} title="차트에서 보기">
            {order.symbol}
          </button>
        </TableCell>
        <TableCell className="py-2">
          <span className={`font-medium ${order.side === "long" ? "text-emerald-400" : "text-red-400"}`}>{order.side.toUpperCase()}</span>
        </TableCell>
        <TableCell className="py-2 text-center">{confidenceDots(order.confidence)}</TableCell>
        <TableCell className="py-2 text-right font-mono tabular-nums">
          <div>{order.entry_price.toLocaleString()}</div>
          {order.fill_time && <div className="text-[10px] text-muted-foreground/60" title={`체결: ${formatTime(order.fill_time)}`}>@ {order.entry_price.toLocaleString()}</div>}
        </TableCell>
        <TableCell className="py-2 text-right font-mono tabular-nums">
          <div>{order.tp_price.toLocaleString()}{order.tp1_hit ? <span className="ml-1 text-emerald-400">&#10003;</span> : null}</div>
          {order.close_price !== null && (order.close_reason === "TP" || order.close_reason === "TP2") && <div className="text-[10px] text-emerald-400/60">@ {order.close_price.toLocaleString()}</div>}
        </TableCell>
        <TableCell className="py-2 text-right font-mono tabular-nums">
          <div>{order.tp2_price ? order.tp2_price.toLocaleString() : "-"}</div>
          {order.close_price !== null && order.close_reason === "TP2" && order.tp2_price && <div className="text-[10px] text-emerald-400/60">@ {order.close_price.toLocaleString()}</div>}
        </TableCell>
        <TableCell className="py-2 text-right font-mono tabular-nums">
          <div>{order.sl_price.toLocaleString()}</div>
          {order.close_price !== null && (order.close_reason === "SL" || order.close_reason === "SL_BE") && <div className="text-[10px] text-red-400/60">@ {order.close_price.toLocaleString()}</div>}
          {order.close_price !== null && order.close_reason === "TIMEOUT_6H" && <div className="text-[10px] text-amber-400/60">@ {order.close_price.toLocaleString()}</div>}
        </TableCell>
        <TableCell className="py-2 text-right font-mono tabular-nums text-muted-foreground">${order.margin.toFixed(2)}</TableCell>
        <TableCell className={`py-2 text-right font-mono tabular-nums ${order.pnl !== null ? (order.pnl > 0 ? "text-emerald-400" : order.pnl < 0 ? "text-red-400" : "") : "text-muted-foreground"}`}>
          {order.pnl !== null ? `${order.pnl > 0 ? "+" : ""}${order.pnl.toFixed(2)}` : order.tp1_pnl !== null ? <span className="text-amber-400">+{order.tp1_pnl.toFixed(2)}</span> : "-"}
        </TableCell>
        <TableCell className="py-2">{reasonBadge(order.close_reason)}</TableCell>
        <TableCell className="py-2 text-right font-mono tabular-nums text-muted-foreground">
          {order.balance_after !== null ? `$${order.balance_after.toFixed(2)}` : "-"}
        </TableCell>
        <TableCell className="py-2">
          <button className="text-primary hover:underline font-mono text-[10px]" onClick={() => onClickAnalysis(order.batch_id)} title="시장 분석 보기">분석</button>
        </TableCell>
        <TableCell className="py-2 max-w-[160px] text-muted-foreground">
          <div className="whitespace-pre-wrap line-clamp-2">{order.description || "-"}</div>
        </TableCell>
        <TableCell className="py-2">
          <button className="text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-primary transition-all text-[10px]" onClick={startEdit} title={isPending ? "주문 수정" : "근거 수정"}>수정</button>
        </TableCell>
      </TableRow>
    );
  }

  // Editing mode
  return (
    <>
      <TableRow className="bg-accent/20 text-xs border-border/30">
        <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
          <div className="text-[10px] font-mono">{formatTime(order.created_at)}</div>
        </TableCell>
        <TableCell className="py-2">{statusBadge(order.status)}</TableCell>
        <TableCell className="py-2">
          {isPending ? (
            <select className="w-full rounded-md border border-border bg-background px-1 py-1 text-xs" value={draft.order_type || "limit"} onChange={(e) => setDraft({ ...draft, order_type: e.target.value as "limit" | "market" })}>
              <option value="limit">LIMIT</option><option value="market">MARKET</option>
            </select>
          ) : <span className="font-mono">{order.order_type.toUpperCase()}</span>}
        </TableCell>
        <TableCell className="py-2">
          {isPending ? (
            <select className="w-full rounded-md border border-border bg-background px-1 py-1 text-xs" value={draft.symbol || order.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })}>
              {TOP_COINS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : <span className="font-mono">{order.symbol}</span>}
        </TableCell>
        <TableCell className="py-2">
          {isPending ? (
            <select className="w-full rounded-md border border-border bg-background px-1 py-1 text-xs" value={draft.side || order.side} onChange={(e) => setDraft({ ...draft, side: e.target.value as "long" | "short" })}>
              <option value="long">Long</option><option value="short">Short</option>
            </select>
          ) : <span className={order.side === "long" ? "text-emerald-400" : "text-red-400"}>{order.side.toUpperCase()}</span>}
        </TableCell>
        <TableCell className="py-2">
          {isPending ? (
            <div className="flex gap-0.5">{[1,2,3,4,5].map((l) => (
              <button key={l} className={`w-4 h-4 rounded text-[10px] ${l <= (draft.confidence || 3) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`} onClick={() => setDraft({ ...draft, confidence: l })}>{l}</button>
            ))}</div>
          ) : confidenceDots(order.confidence)}
        </TableCell>
        <TableCell className="py-2">{isPending ? <input type="number" step="any" className="w-full rounded-md border border-border bg-background px-1 py-1 text-xs text-right font-mono" value={draft.entry_price || ""} onChange={(e) => setDraft({ ...draft, entry_price: parseFloat(e.target.value) || 0 })} /> : <span className="font-mono">{order.entry_price.toLocaleString()}</span>}</TableCell>
        <TableCell className="py-2">{isPending ? <input type="number" step="any" className="w-full rounded-md border border-border bg-background px-1 py-1 text-xs text-right font-mono" value={draft.tp_price || ""} onChange={(e) => setDraft({ ...draft, tp_price: parseFloat(e.target.value) || 0 })} /> : <span className="font-mono">{order.tp_price.toLocaleString()}</span>}</TableCell>
        <TableCell className="py-2">{isPending ? <input type="number" step="any" className="w-full rounded-md border border-border bg-background px-1 py-1 text-xs text-right font-mono" placeholder="-" value={draft.tp2_price ?? ""} onChange={(e) => setDraft({ ...draft, tp2_price: e.target.value ? parseFloat(e.target.value) || null : null })} /> : <span className="font-mono">{order.tp2_price ? order.tp2_price.toLocaleString() : "-"}</span>}</TableCell>
        <TableCell className="py-2">{isPending ? <input type="number" step="any" className="w-full rounded-md border border-border bg-background px-1 py-1 text-xs text-right font-mono" value={draft.sl_price || ""} onChange={(e) => setDraft({ ...draft, sl_price: parseFloat(e.target.value) || 0 })} /> : <span className="font-mono">{order.sl_price.toLocaleString()}</span>}</TableCell>
        <TableCell className="py-2 text-right font-mono tabular-nums text-muted-foreground">${order.margin.toFixed(2)}</TableCell>
        <TableCell className="py-2 text-right font-mono tabular-nums text-muted-foreground">-</TableCell>
        <TableCell className="py-2">{reasonBadge(order.close_reason)}</TableCell>
        <TableCell className="py-2 text-right font-mono tabular-nums text-muted-foreground">
          {order.balance_after !== null ? `$${order.balance_after.toFixed(2)}` : "-"}
        </TableCell>
        <TableCell className="py-2"></TableCell>
        <TableCell className="py-2">
          <textarea className="w-full rounded-md border border-border bg-background px-1 py-1 text-xs resize-y" rows={3} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </TableCell>
        <TableCell className="py-2">
          <div className="flex gap-1">
            <button className="text-primary hover:underline text-[10px]" onClick={handleSave} disabled={saving}>{saving ? "..." : "저장"}</button>
            <button className="text-muted-foreground hover:underline text-[10px]" onClick={() => setEditing(false)}>취소</button>
          </div>
        </TableCell>
      </TableRow>
      {error && <TableRow><TableCell colSpan={16} className="text-xs text-destructive py-1">{error}</TableCell></TableRow>}
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

  // Auto-select most recent order's coin on initial load
  useEffect(() => {
    if (initialCoinSet.current || orders.length === 0) return;
    const sorted = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latest = sorted[0];
    setChartCoin(latest.symbol);
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
    // scrollToTime queues internally if chart isn't ready yet
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

  if (loading) return <div className="text-center py-20 text-muted-foreground text-sm">불러오는 중...</div>;
  if (!model) return <div className="text-center py-20 text-muted-foreground text-sm">모델을 찾을 수 없습니다.</div>;

  const returnPct = ((model.balance - model.seed) / model.seed) * 100;
  const sortedOrders = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const sortedBatches = [...batches].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const ordersByBatch = new Map<string, BenchmarkOrder[]>();
  for (const o of orders) {
    const list = ordersByBatch.get(o.batch_id) || [];
    list.push(o);
    ordersByBatch.set(o.batch_id, list);
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-border/60 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => router.push("/benchmark/models")}>
              <span className="mr-1">&#8592;</span> 리더보드
            </button>
            <div className="w-px h-5 bg-border/60" />
            {renaming ? (
              <div className="flex items-center gap-2">
                <input type="text" className="rounded-lg border border-border bg-background px-3 py-1 text-lg font-semibold focus:border-primary/50 focus:outline-none" value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }} autoFocus />
                <Button size="sm" onClick={handleRename}>저장</Button>
                <Button size="sm" variant="outline" onClick={() => setRenaming(false)}>취소</Button>
                {renameError && <span className="text-xs text-destructive">{renameError}</span>}
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-lg font-semibold tracking-tight">{model.name}</h1>
                <button className="text-[10px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-foreground transition-all"
                  onClick={() => { setNewName(model.name); setRenaming(true); setRenameError(""); }}>이름 변경</button>
              </div>
            )}
          </div>
          <div className="flex gap-3 items-center text-sm">
            <button className="px-3 py-1.5 rounded-md text-primary-foreground bg-primary hover:bg-primary/90 text-xs transition-colors" onClick={() => router.push(`/benchmark?model=${encodeURIComponent(model?.name || "")}`)}>주문 입력</button>
            <button className="text-xs text-muted-foreground hover:text-destructive transition-colors" onClick={handleDeleteModel}>삭제</button>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-border/40 bg-card/30 overflow-y-auto px-4 py-4 space-y-1">
          <StatItem label="잔액" value={`$${model.balance.toFixed(2)}`} />
          <StatItem label="수익률" value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`}
            color={returnPct >= 0 ? "text-emerald-400" : "text-red-400"} sub={`P&L: $${model.cumulative_pnl.toFixed(2)}`} />
          <StatItem label="승률" value={`${model.win_rate.toFixed(1)}%`} sub={`${model.closed_orders} 청산`} />
          <StatItem label="MDD" value={`${model.mdd.toFixed(1)}%`} color="text-amber-400" />
          <StatItem label="Profit Factor" value={model.profit_factor !== null ? model.profit_factor.toFixed(2) : "-"} />
          <StatItem label="가용 잔액" value={`$${model.available_balance.toFixed(2)}`} sub={`마진: $${model.active_margin.toFixed(2)}`} />

          {/* Coin navigation */}
          {orderCoins.length > 0 && (
            <div className="pt-3 mt-2 border-t border-border/40">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">코인 목록</div>
              <div className="space-y-0.5">
                {orderCoins.map((coin) => {
                  const count = orders.filter((o) => o.symbol === coin).length;
                  return (
                    <button key={coin}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                        chartCoin === coin
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-transparent"
                      }`}
                      onClick={() => { setChartCoin(coin); setChartTab("chart"); }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-medium">{coin}</span>
                        <span className="text-[10px] opacity-60">{count}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Right content */}
        <main className="flex-1 overflow-hidden">
          <ResizableSplit
            top={
              <div className="h-full flex flex-col">
                {/* Chart tabs */}
                <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 border-b border-border/40 bg-card/30">
                  <button onClick={() => setChartTab("equity")}
                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${chartTab === "equity" ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"}`}>
                    수익 곡선
                  </button>
                  <button onClick={() => setChartTab("chart")}
                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${chartTab === "chart" ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"}`}>
                    차트
                  </button>

                </div>

                {/* Chart content */}
                <div className="flex-1 overflow-hidden relative">
                  {chartTab === "equity" ? (
                    orders.filter((o) => o.status === "CLOSED").length > 0 ? (
                      <div className="h-full flex items-center justify-center p-4">
                        <EquityCurve seed={model.seed} closedOrders={orders.filter((o) => o.status === "CLOSED")} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">청산된 주문이 없습니다.</div>
                    )
                  ) : (
                    chartCoin ? (
                      <BenchmarkChart ref={chartRef} symbol={chartCoin} orders={chartCoinOrders} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        좌측에서 코인을 선택하세요.
                      </div>
                    )
                  )}
                </div>
              </div>
            }
            bottom={
              <div className="h-full flex flex-col">
                {/* Bottom tabs */}
                <div className="flex-shrink-0 flex items-center gap-6 px-4 py-2.5 border-b border-border/40 bg-card/30">
                  <button onClick={() => setBottomTab("orders")}
                    className={`text-xs font-medium pb-0.5 transition-all ${bottomTab === "orders" ? "text-foreground border-b border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    주문 내역 <span className="text-muted-foreground ml-1">{orders.length}</span>
                  </button>
                  <button onClick={() => setBottomTab("analyses")}
                    className={`text-xs font-medium pb-0.5 transition-all ${bottomTab === "analyses" ? "text-foreground border-b border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    시장 분석 <span className="text-muted-foreground ml-1">{batches.length}</span>
                  </button>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-auto">
                  {bottomTab === "orders" ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/30 hover:bg-transparent">
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium">시간</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium">상태</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium">유형</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium">코인</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium">방향</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium text-center">확신</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium text-right">진입가</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium text-right">TP1</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium text-right">TP2</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium text-right">SL</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium text-right">마진</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium text-right">P&L</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium">사유</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium text-right">잔액</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium">분석</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-medium">근거</TableHead>
                          <TableHead className="w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedOrders.map((o) => (
                          <EditableOrderRow key={o.id} order={o} onSave={loadData}
                            onClickSymbol={handleClickSymbol} onClickAnalysis={handleClickAnalysis} />
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="divide-y divide-border/30">
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
                          <div key={batch.id} ref={(el) => { if (el) batchRefs.current.set(batch.id, el); }}>
                            {/* Collapsed header */}
                            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/20 group transition-colors"
                              onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}>
                              <span className={`text-[10px] text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}>&#9654;</span>
                              <span className="text-[10px] font-mono text-muted-foreground/50">#{batch.id}</span>
                              <span className="text-xs text-muted-foreground">{formatTime(batch.created_at)}</span>
                              {isAnalysisOnly ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent text-muted-foreground border border-border/40">분석만</span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/50">{orderCount}건</span>
                              )}
                              <span className="text-xs text-muted-foreground/40 truncate flex-1">{firstLine}</span>

                              {(isAnalysisOnly || hasPending || allTerminal) && (
                                <button className="text-[10px] text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-destructive flex-shrink-0 transition-all"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.id); }} title="배치 삭제">삭제</button>
                              )}
                            </div>

                            {/* Expanded */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1">
                                <EditableAnalysis batch={batch} onSave={loadData} />
                                {orderCount > 0 && (
                                  <div className="mt-3 text-xs text-muted-foreground">
                                    <span className="text-[10px] uppercase tracking-wider font-medium mr-2">주문:</span>
                                    {batchOrders.map((o) => (
                                      <span key={o.id} className="inline-flex items-center gap-1 mr-3">
                                        <span className={o.side === "long" ? "text-emerald-400" : "text-red-400"}>{o.side.toUpperCase()}</span>
                                        <span className="font-mono">{o.symbol}</span>
                                        <span className="text-muted-foreground/60">@ {o.entry_price.toLocaleString()}</span>
                                        {o.pnl !== null && <span className={o.pnl > 0 ? "text-emerald-400" : "text-red-400"}>({o.pnl > 0 ? "+" : ""}{o.pnl.toFixed(2)})</span>}
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
                        <div className="text-center py-10 text-muted-foreground text-sm">아직 분석이 없습니다.</div>
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

  // Gradient fill
  const areaPoints = [...points, `${parseFloat(lastPt[0])},${h - pad}`, `${pad},${h - pad}`].join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 200 }}>
      <defs>
        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#equityGrad)" />
      <line x1={pad} y1={seedY} x2={w - pad} y2={seedY} stroke="#71717a" strokeDasharray="4" strokeWidth="0.5" />
      <text x={w - pad + 4} y={seedY + 4} fill="#71717a" fontSize="9">${seed}</text>
      <polyline points={points.join(" ")} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
      <circle cx={parseFloat(lastPt[0])} cy={parseFloat(lastPt[1])} r="2.5" fill="#3b82f6" />
    </svg>
  );
}
