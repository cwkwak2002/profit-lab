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
  entry_time: string;
  entry_price: number;
  entry_margin: number;
  exit_time: string;
  exit_price: number;
  exit_reason: string;
  pnl: number;
  pnl_pct: number;
  balance_after: number;
}

export interface BacktestRun {
  id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  coins: string[];
  params: Record<string, number>;
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

export async function getBacktestSummary(runId: string): Promise<BacktestSummary> {
  return fetchApi(`/api/backtest/${runId}/summary`);
}

export async function getBacktestCoins(runId: string): Promise<{ coins: CoinSummary[] }> {
  return fetchApi(`/api/backtest/${runId}/coins`);
}

export async function getCoinTrades(runId: string, symbol: string): Promise<{ trades: Trade[] }> {
  return fetchApi(`/api/backtest/${runId}/coins/${symbol}/trades`);
}
