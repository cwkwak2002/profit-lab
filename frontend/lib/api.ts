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
