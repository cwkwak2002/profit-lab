"use client";

import { useEffect, useRef, memo, forwardRef, useImperativeHandle, useCallback } from "react";
import { getCandles, type Timeframe, type Trade } from "@/lib/api";

interface Props {
  symbol: string;
  interval?: string;
  showRsi?: boolean;
  trades?: Trade[];
}

export interface TradingViewChartHandle {
  scrollToTime: (unixSeconds: number) => void;
}

const EXIT_LABELS: Record<string, string> = {
  SL: "SL", TP2: "TP2", FIXED_TP: "TP+3.5%",
  BE: "BE", EMA_CROSS: "EMA Cross", TRAIL: "Trail", TIMEOUT: "Timeout",
};

function applyTradeMarkers(widget: any, trades: Trade[], shapesRef: React.MutableRefObject<any[]>) {
  try {
    const chart = widget.activeChart();
    if (!chart) return;
    for (const s of shapesRef.current) { try { s.remove(); } catch { /* */ } }
    shapesRef.current = [];

    for (const trade of trades) {
      if (trade.exit_reason.startsWith("RISK_")) continue;
      const isLong = trade.side !== "short";
      const entryTs = new Date(trade.entry_time + "Z").getTime() / 1000;

      // Entry
      const entryShape = chart.createExecutionShape();
      if (entryShape) {
        entryShape
          .setDirection(isLong ? "buy" : "sell")
          .setTime(entryTs)
          .setText(isLong ? "▲ Long" : "▼ Short")
          .setTooltip(`진입 @ $${trade.entry_price.toLocaleString()}`)
          .setTextColor(isLong ? "#22c55e" : "#ef4444")
          .setArrowColor(isLong ? "#22c55e" : "#ef4444")
          .setFont("bold 11px sans-serif");
        shapesRef.current.push(entryShape);
      }

      // TP1
      if (trade.tp1_time) {
        const tp1Ts = new Date(trade.tp1_time + "Z").getTime() / 1000;
        const tp1Shape = chart.createExecutionShape();
        if (tp1Shape) {
          tp1Shape
            .setDirection(isLong ? "sell" : "buy")
            .setTime(tp1Ts)
            .setText("TP1")
            .setTooltip("1차 익절 (50%)")
            .setTextColor("#3b82f6")
            .setArrowColor("#3b82f6")
            .setFont("11px sans-serif");
          shapesRef.current.push(tp1Shape);
        }
      }

      // Exit
      if (trade.exit_time) {
        const exitTs = new Date(trade.exit_time + "Z").getTime() / 1000;
        const reason = trade.exit_reason;
        const label = EXIT_LABELS[reason] || reason;
        const isProfit = ["TP2", "FIXED_TP", "TRAIL"].includes(reason);
        const isSl = reason === "SL";
        const exitColor = isProfit ? "#22c55e" : isSl ? "#ef4444" : "#f59e0b";
        const pnlStr = trade.pnl != null ? ` (${trade.pnl > 0 ? "+" : ""}${trade.pnl.toFixed(2)})` : "";
        const exitShape = chart.createExecutionShape();
        if (exitShape) {
          exitShape
            .setDirection(isLong ? "sell" : "buy")
            .setTime(exitTs)
            .setText(`${label}${pnlStr}`)
            .setTooltip(`${label} @ $${trade.exit_price?.toLocaleString() || "?"}${pnlStr}`)
            .setTextColor(exitColor)
            .setArrowColor(exitColor)
            .setFont("bold 11px sans-serif");
          shapesRef.current.push(exitShape);
        }
      }
    }
  } catch { /* chart not ready */ }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const CHART_SETTINGS_KEY = "profit-lab-chart-settings";

function loadSavedChartState(): any {
  if (typeof window === "undefined") return undefined;
  try {
    const s = localStorage.getItem(CHART_SETTINGS_KEY);
    return s ? JSON.parse(s) : undefined;
  } catch { return undefined; }
}

function saveChartState(widget: any) {
  try {
    widget.save((state: any) => {
      try { localStorage.setItem(CHART_SETTINGS_KEY, JSON.stringify(state)); } catch { /* */ }
    });
  } catch { /* */ }
}

const RESOLUTION_TO_TF: Record<string, Timeframe> = {
  "1": "1m", "5": "5m", "15": "15m", "30": "30m",
  "60": "1h", "240": "4h", "1D": "1D",
};

const INTERVAL_MAP: Record<string, string> = {
  "1m": "1", "5m": "5", "15m": "15", "30m": "30",
  "1h": "60", "4h": "240", "1D": "D",
};

const SUPPORTED_RESOLUTIONS = ["1", "5", "15", "30", "60", "240", "1D"];

function getPriceScale(sym: string): number {
  if (sym === "BTC") return 10;
  if (["ETH", "BNB"].includes(sym)) return 100;
  if (sym.startsWith("1000")) return 1000000;
  return 10000;
}

function createDatafeed(symbol: string) {
  return {
    onReady: (cb: any) => {
      setTimeout(() => cb({ supported_resolutions: SUPPORTED_RESOLUTIONS }), 0);
    },
    searchSymbols: (_i: any, _e: any, _t: any, onResult: any) => onResult([]),
    resolveSymbol: (_name: any, onResolve: any) => {
      setTimeout(() => onResolve({
        name: `${symbol}/USDT`,
        ticker: symbol,
        full_name: `${symbol}/USDT`,
        description: `${symbol}/USDT Perpetual`,
        type: "crypto",
        session: "24x7",
        exchange: "Bybit",
        listed_exchange: "Bybit",
        timezone: "Asia/Seoul",
        format: "price",
        minmov: 1,
        pricescale: getPriceScale(symbol),
        has_intraday: true,
        has_daily_and_weekly: true,
        supported_resolutions: SUPPORTED_RESOLUTIONS,
        volume_precision: 2,
        data_status: "streaming",
      }), 0);
    },
    getBars: async (
      _symbolInfo: any,
      resolution: string,
      periodParams: { from: number; to: number; firstDataRequest: boolean },
      onResult: any,
      onError: any,
    ) => {
      try {
        const tf = RESOLUTION_TO_TF[resolution] || "15m";
        const startDate = new Date(periodParams.from * 1000).toISOString().split("T")[0];
        const endDate = new Date(periodParams.to * 1000).toISOString().split("T")[0];
        const { candles } = await getCandles(symbol, tf, startDate, endDate);
        const bars = candles.map((c) => ({
          time: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));
        onResult(bars, { noData: bars.length === 0 });
      } catch (e: any) {
        onError(e?.message || "Failed to fetch");
      }
    },
    subscribeBars: () => {},
    unsubscribeBars: () => {},
  };
}

function loadChartingLibrary(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded?
    try {
      const tv = (window as any).TradingView;
      if (tv?.widget && typeof tv.version === "function" && tv.version().includes("v27")) {
        resolve();
        return;
      }
    } catch { /* */ }

    const script = document.createElement("script");
    script.src = "/tradingview/charting_library.standalone.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

const TradingViewChartInner = forwardRef<TradingViewChartHandle, Props>(
function TradingViewChartInner({ symbol, interval = "15m", showRsi = true, trades }: Props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const shapesRef = useRef<any[]>([]);
  const tradesRef = useRef<Trade[]>(trades ?? []);

  const scrollToTime = useCallback((unixSeconds: number) => {
    const widget = widgetRef.current;
    if (!widget) return;
    const halfRange = 6 * 3600;
    try {
      widget.onChartReady(() => {
        widget.activeChart().setVisibleRange({ from: unixSeconds - halfRange, to: unixSeconds + halfRange });
      });
    } catch { /* ignore */ }
  }, []);

  useImperativeHandle(ref, () => ({ scrollToTime }), [scrollToTime]);

  // Sync tradesRef and re-apply markers when trades prop changes
  useEffect(() => {
    tradesRef.current = trades ?? [];
    const widget = widgetRef.current;
    if (!widget) return;
    try {
      widget.onChartReady(() => applyTradeMarkers(widget, tradesRef.current, shapesRef));
    } catch { /* */ }
  }, [trades]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;

    loadChartingLibrary().then(() => {
      if (destroyed || !containerRef.current) return;
      const TV = (window as any).TradingView;
      if (!TV?.widget) return;

      const tvInterval = INTERVAL_MAP[interval] || "15";
      const studies = showRsi ? ["RSI@tv-basicstudies"] : [];
      const savedState = loadSavedChartState();

      const widget = new TV.widget({
        container: el,
        library_path: "/tradingview/",
        datafeed: createDatafeed(symbol),
        symbol: symbol,
        interval: tvInterval,
        ...(savedState ? { saved_data: savedState } : {}),
        locale: "ko",
        timezone: "Asia/Seoul",
        theme: "dark",
        autosize: true,
        toolbar_bg: "#0d1526",
        overrides: {
          "paneProperties.background": "#0d1526",
          "paneProperties.backgroundType": "solid",
          "mainSeriesProperties.candleStyle.upColor": "#22c55e",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
          "mainSeriesProperties.candleStyle.borderUpColor": "#22c55e",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
          "mainSeriesProperties.candleStyle.wickUpColor": "#4ade80",
          "mainSeriesProperties.candleStyle.wickDownColor": "#f87171",
        },
        disabled_features: [
          "header_symbol_search",
          "symbol_search_hot_key",
          "header_compare",
          "display_market_status",
          "timeframes_toolbar",
          "order_panel",
          "object_tree_legend_mode",
          "show_object_tree",
        ],
        enabled_features: [
          "hide_left_toolbar_by_default",
        ],
        loading_screen: { backgroundColor: "#0d1526", foregroundColor: "#3b82f6" },
      });

      widgetRef.current = widget;

      widget.onChartReady(() => {
        // Auto-save chart state when indicators change
        try {
          widget.subscribe("onAutoSaveNeeded", () => saveChartState(widget));
        } catch { /* */ }
        // RSI study (only if no saved state — saved state restores studies automatically)
        if (!savedState) {
          for (const study of studies) {
            try { widget.activeChart().createStudy(study.split("@")[0]); } catch { /* */ }
          }
        }
        // Trade markers
        applyTradeMarkers(widget, tradesRef.current, shapesRef);
      });
    });

    return () => {
      destroyed = true;
      if (widgetRef.current) {
        saveChartState(widgetRef.current);
        try { widgetRef.current.remove(); } catch { /* */ }
        widgetRef.current = null;
      }
    };
  }, [symbol, interval, showRsi]);

  return <div ref={containerRef} className="w-full h-full" />;
});

/* eslint-enable @typescript-eslint/no-explicit-any */

export const TradingViewChart = memo(TradingViewChartInner);
