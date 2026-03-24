const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// --- Types ---

export interface SyncRequest {
  coins: string[];
  start_date: string;
  end_date: string;
}

export interface SyncResponse {
  synced: Record<string, { "1h": number; "1m": number }>;
  errors: Record<string, string>;
}

export interface BacktestRequest {
  coins: string[];
  start_date: string;
  end_date: string;
  seed?: number;
  leverage?: number;
  strategy?: string;
}

export interface BacktestRunResponse {
  run_id: string;
}

export interface CoinSummary {
  run_id: string;
  symbol: string;
  total_trades: number;
  win_rate: number;
  cumulative_return: number;
  max_drawdown: number;
  final_balance: number;
}

export interface Trade {
  id: number;
  run_id: string;
  symbol: string;
  side: "long" | "short";
  entry_time: string;
  entry_price: number;
  entry_margin: number;
  exit_time: string;
  exit_price: number;
  exit_reason: string;
  pnl: number;
  pnl_pct: number;
  balance_after: number;
  tp1_time: string | null;
}

export interface BacktestRun {
  id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  coins: string[];
  params: Record<string, number | string>;
}

export interface BacktestSummary {
  run: BacktestRun;
  aggregate: {
    total_trades: number;
    avg_win_rate: number;
    avg_return: number;
    avg_mdd: number;
  };
}

// --- Progress event type ---

export interface ProgressEvent {
  phase: "sync" | "backtest" | "done";
  message: string;
  progress: number;
  symbol?: string;
  error?: boolean;
  run_id?: string;
}

// --- API Functions ---

export async function syncData(req: SyncRequest): Promise<SyncResponse> {
  return fetchApi("/api/data/sync", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getSymbols(): Promise<{ symbols: string[] }> {
  return fetchApi("/api/data/symbols");
}

export async function runBacktest(req: BacktestRequest): Promise<BacktestRunResponse> {
  return fetchApi("/api/backtest/run", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function runBacktestStream(
  req: BacktestRequest,
  onProgress: (event: ProgressEvent) => void,
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/backtest/run-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let runId = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data: ProgressEvent = JSON.parse(line.slice(6));
        onProgress(data);
        if (data.run_id) {
          runId = data.run_id;
        }
      }
    }
  }

  if (!runId) throw new Error("No run_id received");
  return runId;
}

export async function getBacktestSummary(runId: string): Promise<BacktestSummary> {
  return fetchApi(`/api/backtest/${runId}/summary`);
}

export async function getBacktestCoins(runId: string): Promise<{ coins: CoinSummary[] }> {
  return fetchApi(`/api/backtest/${runId}/coins`);
}

export async function getCoinTrades(runId: string, symbol: string): Promise<{ trades: Trade[] }> {
  return fetchApi(`/api/backtest/${runId}/coins/${symbol}/trades`);
}

// --- Candle data ---

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Strategy-specific indicators
  rsi?: number | null;
  ema50?: number | null;
  ema200?: number | null;
  adx?: number | null;
  bb_lower?: number | null;
  bb_mid?: number | null;
  bb_upper?: number | null;
  bb_width?: number | null;
}

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1D";

export async function getCandles(
  symbol: string,
  timeframe: Timeframe,
  startDate: string,
  endDate: string,
  strategy?: string,
): Promise<{ candles: Candle[] }> {
  const strategyParam = strategy ? `&strategy=${strategy}` : "";
  return fetchApi(
    `/api/data/candles?symbol=${symbol}&timeframe=${timeframe}&start_date=${startDate}&end_date=${endDate}${strategyParam}`,
  );
}

// --- AI Benchmark Types ---

export interface BenchmarkModel {
  id: string;
  name: string;
  balance: number;
  seed: number;
  created_at: string;
  total_orders: number;
  closed_orders: number;
  cancelled_orders: number;
  win_rate: number;
  mdd: number;
  profit_factor: number | null;
  avg_holding_minutes: number;
  fill_rate: number;
  cumulative_pnl: number;
  unrealized_pnl: number;
  active_margin: number;
  available_balance: number;
}

export interface BenchmarkOrder {
  id: number;
  model_id: string;
  batch_id: string;
  symbol: string;
  side: "long" | "short";
  entry_price: number;
  tp_price: number;
  sl_price: number;
  description: string;
  margin: number;
  status: "PENDING" | "FILLED" | "CLOSED" | "CANCELLED";
  created_at: string;
  fill_time: string | null;
  close_time: string | null;
  close_price: number | null;
  close_reason: string | null;
  pnl: number | null;
  pnl_pct: number | null;
  balance_after: number | null;
  order_type: "limit" | "market";
  confidence: number;
  tp2_price: number | null;
  tp1_hit: number;
  tp1_pnl: number | null;
}

export interface BenchmarkBatch {
  id: string;
  model_id: string;
  market_analysis: string;
  created_at: string;
}

export interface OrderInput {
  symbol: string;
  side: "long" | "short";
  entry_price: number;
  tp_price: number;
  sl_price: number;
  description: string;
  order_type: "limit" | "market";
  confidence: number;
  tp2_price: number | null;
}

export interface SubmitOrdersRequest {
  model_name: string;
  market_analysis: string;
  orders: OrderInput[];
}

// --- AI Benchmark API ---

export async function getBenchmarkModelNames(): Promise<{ names: string[] }> {
  return fetchApi("/api/benchmark/model-names");
}

export async function getBenchmarkModels(): Promise<{ models: BenchmarkModel[] }> {
  return fetchApi("/api/benchmark/models");
}

export async function getBenchmarkModel(modelId: string): Promise<BenchmarkModel> {
  return fetchApi(`/api/benchmark/models/${modelId}`);
}

export async function getBenchmarkOrders(modelId: string): Promise<{ orders: BenchmarkOrder[] }> {
  return fetchApi(`/api/benchmark/models/${modelId}/orders`);
}

export async function getBenchmarkBatches(modelId: string): Promise<{ batches: BenchmarkBatch[] }> {
  return fetchApi(`/api/benchmark/models/${modelId}/batches`);
}

export async function submitBenchmarkOrders(req: SubmitOrdersRequest): Promise<{
  model_id: string;
  batch_id: string;
  margin_per_order: number;
  invalid_orders: string[];
  valid_count: number;
  invalid_count: number;
}> {
  return fetchApi("/api/benchmark/orders", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function updateBenchmarkOrder(
  orderId: number,
  updates: Partial<OrderInput> & { description?: string },
): Promise<{ ok: boolean }> {
  return fetchApi(`/api/benchmark/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function updateBenchmarkBatch(
  batchId: string,
  marketAnalysis: string,
): Promise<{ ok: boolean }> {
  return fetchApi(`/api/benchmark/batches/${batchId}`, {
    method: "PATCH",
    body: JSON.stringify({ market_analysis: marketAnalysis }),
  });
}

export async function renameBenchmarkModel(
  modelId: string,
  name: string,
): Promise<{ ok: boolean }> {
  return fetchApi(`/api/benchmark/models/${modelId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function deleteBenchmarkModel(
  modelId: string,
): Promise<{ ok: boolean }> {
  return fetchApi(`/api/benchmark/models/${modelId}`, {
    method: "DELETE",
  });
}

export async function deleteBenchmarkBatch(
  batchId: string,
): Promise<{ ok: boolean; cancelled_orders: number }> {
  return fetchApi(`/api/benchmark/batches/${batchId}`, {
    method: "DELETE",
  });
}

export function subscribeBenchmarkStream(
  onEvent: (event: Record<string, unknown>) => void,
): EventSource {
  const es = new EventSource(`${API_BASE}/api/benchmark/stream`);
  es.onmessage = (e) => {
    onEvent(JSON.parse(e.data));
  };
  return es;
}
