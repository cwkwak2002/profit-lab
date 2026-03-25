"use client";

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import type { BenchmarkOrder } from "@/lib/api";
import { getCandles, getTicker, type Timeframe } from "@/lib/api";

export interface BenchmarkChartHandle {
  scrollToTime: (timeSeconds: number) => void;
}

interface Props {
  symbol: string;
  orders: BenchmarkOrder[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const RESOLUTION_TO_TF: Record<string, Timeframe> = {
  "1": "1m", "5": "5m", "15": "15m", "30": "30m",
  "60": "1h", "240": "4h", "1D": "1D",
};

const SUPPORTED_RESOLUTIONS = ["1", "5", "15", "30", "60", "240", "1D"];

function getPriceScale(sym: string): number {
  if (sym === "BTC") return 10;
  if (["ETH", "BNB"].includes(sym)) return 100;
  if (sym.startsWith("1000")) return 1000000;
  return 10000;
}

const REASON_LABELS: Record<string, string> = {
  TP: "TP", TP2: "TP2", SL: "SL", SL_BE: "SL(BE)",
  TIMEOUT_6H: "6h", CANCEL_30M: "30m", MANUAL: "DEL",
};

function createDatafeed(symbol: string, hasOpenPosition: () => boolean) {
  const subscriptions = new Map<string, ReturnType<typeof setInterval>>();
  let lastBar: { time: number; open: number; high: number; low: number; close: number; volume: number } | null = null;

  return {
    onReady: (cb: any) => {
      setTimeout(() => cb({ supported_resolutions: SUPPORTED_RESOLUTIONS }), 0);
    },
    searchSymbols: (_input: any, _exchange: any, _type: any, onResult: any) => onResult([]),
    resolveSymbol: (_name: any, onResolve: any) => {
      setTimeout(() =>
        onResolve({
          name: symbol,
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
        }),
      0);
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
        if (bars.length > 0) lastBar = { ...bars[bars.length - 1] };
        onResult(bars, { noData: bars.length === 0 });
      } catch (e: any) {
        onError(e?.message || "Failed to fetch candles");
      }
    },
    subscribeBars: (
      _symbolInfo: any,
      resolution: string,
      onRealtimeCallback: any,
      subscriberUID: string,
    ) => {
      if (!hasOpenPosition()) return;

      const resMs: Record<string, number> = {
        "1": 60000, "5": 300000, "15": 900000, "30": 1800000,
        "60": 3600000, "240": 14400000, "1D": 86400000,
      };
      const barDuration = resMs[resolution] || 60000;

      const interval = setInterval(async () => {
        if (!hasOpenPosition()) return;
        try {
          const { price, timestamp } = await getTicker(symbol);
          const barTime = Math.floor(timestamp / barDuration) * barDuration;

          if (lastBar && barTime === lastBar.time) {
            // Update current bar
            lastBar.high = Math.max(lastBar.high, price);
            lastBar.low = Math.min(lastBar.low, price);
            lastBar.close = price;
            onRealtimeCallback({ ...lastBar });
          } else {
            // New bar
            lastBar = { time: barTime, open: price, high: price, low: price, close: price, volume: 0 };
            onRealtimeCallback({ ...lastBar });
          }
        } catch { /* ignore ticker errors */ }
      }, 1000);

      subscriptions.set(subscriberUID, interval);
    },
    unsubscribeBars: (subscriberUID: string) => {
      const interval = subscriptions.get(subscriberUID);
      if (interval) {
        clearInterval(interval);
        subscriptions.delete(subscriberUID);
      }
    },
  };
}

/** Add execution shapes (arrows with text) for order entries and exits.
 *  shapesRef holds previously created shapes so they can be removed before re-adding. */
function addExecutionShapes(widget: any, orders: BenchmarkOrder[], shapesRef: React.MutableRefObject<any[]>) {
  try {
    const chart = widget.activeChart();
    if (!chart) return;

    // Remove previously created shapes to prevent duplicates
    for (const s of shapesRef.current) {
      try { s.remove(); } catch { /* ignore */ }
    }
    shapesRef.current = [];

    for (const order of orders) {
      // Order placed marker (show when created_at differs from fill_time)
      if (order.created_at) {
        const createdTimeSec = new Date(order.created_at).getTime() / 1000;
        const fillTimeSec = order.fill_time ? new Date(order.fill_time).getTime() / 1000 : 0;
        const isSameTime = order.fill_time && Math.abs(createdTimeSec - fillTimeSec) < 60;
        if (!isSameTime) {
          const isBuy = order.side === "long";
          const shape = chart.createExecutionShape();
          if (shape) {
            shape
              .setText(isBuy ? "Long 주문" : "Short 주문")
              .setTooltip(`주문 @ ${order.entry_price.toLocaleString()}`)
              .setTextColor("#9ca3af")
              .setArrowColor("#9ca3af")
              .setDirection(isBuy ? "buy" : "sell")
              .setTime(createdTimeSec)
              .setFont("11px sans-serif");
            shapesRef.current.push(shape);
          }
        }
      }

      // Entry arrow
      if (order.fill_time) {
        const fillTimeSec = new Date(order.fill_time).getTime() / 1000;
        const isBuy = order.side === "long";
        const shape = chart.createExecutionShape();
        if (shape) {
          shape
            .setText(isBuy ? "Long 진입" : "Short 진입")
            .setTooltip(`${isBuy ? "Long" : "Short"} @ ${order.entry_price.toLocaleString()}`)
            .setTextColor(isBuy ? "#22c55e" : "#ef4444")
            .setArrowColor(isBuy ? "#22c55e" : "#ef4444")
            .setDirection(isBuy ? "buy" : "sell")
            .setTime(fillTimeSec)
            .setFont("bold 11px sans-serif");
          shapesRef.current.push(shape);
        }
      }

      // Exit arrow
      if (order.close_time && order.close_reason) {
        const closeTimeSec = new Date(order.close_time).getTime() / 1000;
        const reason = order.close_reason;
        const label = REASON_LABELS[reason] || reason;
        const isProfit = reason === "TP" || reason === "TP2";
        const pnlStr = order.pnl !== null
          ? ` (${order.pnl > 0 ? "+" : ""}${order.pnl.toFixed(2)})`
          : "";
        const isBuy = order.side === "long";
        const shape = chart.createExecutionShape();
        if (shape) {
          shape
            .setText(`${label} ${reason === "CANCEL_30M" ? "취소" : "청산"}${pnlStr}`)
            .setTooltip(`${label} @ ${order.close_price?.toLocaleString() || "?"}${pnlStr}`)
            .setTextColor(isProfit ? "#22c55e" : "#ef4444")
            .setArrowColor(isProfit ? "#22c55e" : "#ef4444")
            .setDirection(isBuy ? "sell" : "buy")
            .setTime(closeTimeSec)
            .setFont("bold 11px sans-serif");
          shapesRef.current.push(shape);
        }
      }
    }
  } catch (e) {
    console.error("[BenchmarkChart] addExecutionShapes error:", e);
  }
}

function addOrderLines(widget: any, orders: BenchmarkOrder[]) {
  try {
    const chart = widget.activeChart();
    if (!chart) return;

    for (const order of orders) {
      if (order.status !== "FILLED") continue;

      chart.createOrderLine()
        .setPrice(order.tp_price)
        .setColor("#22c55e")
        .setLineColor("rgba(34,197,94,0.4)")
        .setBodyBorderColor("#22c55e")
        .setBodyBackgroundColor("rgba(34,197,94,0.15)")
        .setBodyTextColor("#22c55e")
        .setQuantity("")
        .setText("TP")
        .setLineStyle(2)
        .setLineLength(25);

      chart.createOrderLine()
        .setPrice(order.sl_price)
        .setColor("#ef4444")
        .setLineColor("rgba(239,68,68,0.4)")
        .setBodyBorderColor("#ef4444")
        .setBodyBackgroundColor("rgba(239,68,68,0.15)")
        .setBodyTextColor("#ef4444")
        .setQuantity("")
        .setText("SL")
        .setLineStyle(2)
        .setLineLength(25);

      if (order.tp2_price) {
        chart.createOrderLine()
          .setPrice(order.tp2_price)
          .setColor("#22c55e")
          .setLineColor("rgba(34,197,94,0.25)")
          .setBodyBorderColor("#22c55e")
          .setBodyBackgroundColor("rgba(34,197,94,0.1)")
          .setBodyTextColor("#22c55e")
          .setQuantity("")
          .setText("TP2")
          .setLineStyle(2)
          .setLineLength(25);
      }

      chart.createOrderLine()
        .setPrice(order.entry_price)
        .setColor("#9ca3af")
        .setLineColor("rgba(156,163,175,0.4)")
        .setBodyBorderColor("#9ca3af")
        .setBodyBackgroundColor("rgba(156,163,175,0.1)")
        .setBodyTextColor("#9ca3af")
        .setQuantity("")
        .setText("Entry")
        .setLineStyle(1)
        .setLineLength(25);
    }
  } catch {
    // ignore
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const CHART_SETTINGS_KEY = "profit-lab-chart-settings";

function loadSavedChartState(): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (typeof window === "undefined") return undefined;
  try {
    const s = localStorage.getItem(CHART_SETTINGS_KEY);
    return s ? JSON.parse(s) : undefined;
  } catch { return undefined; }
}

function saveChartState(widget: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    widget.save((state: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      try { localStorage.setItem(CHART_SETTINGS_KEY, JSON.stringify(state)); } catch { /* */ }
    });
  } catch { /* */ }
}

export const BenchmarkChart = forwardRef<BenchmarkChartHandle, Props>(
  function BenchmarkChart({ symbol, orders }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const chartReadyRef = useRef(false);
    const ordersRef = useRef(orders);
    ordersRef.current = orders;
    const pendingScrollRef = useRef<number | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const executionShapesRef = useRef<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any

    function doScroll(widget: any, timeSeconds: number) { // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        const chart = widget.activeChart();
        chart.setVisibleRange({
          from: timeSeconds - 6 * 3600,
          to: timeSeconds + 6 * 3600,
        });
      } catch { /* ignore */ }
    }

    const scrollToTime = useCallback((timeSeconds: number) => {
      if (widgetRef.current && chartReadyRef.current) {
        doScroll(widgetRef.current, timeSeconds);
      } else {
        pendingScrollRef.current = timeSeconds;
      }
    }, []);

    useImperativeHandle(ref, () => ({ scrollToTime }), [scrollToTime]);

    useEffect(() => {
      const el = containerRef.current;
      if (!el || !symbol) return;

      chartReadyRef.current = false;

      function initWidget() {
        const TV = (window as any).TradingView; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!TV?.widget) return;

        const savedState = loadSavedChartState();

        const widget = new TV.widget({
          container: el,
          library_path: "/tradingview/",
          datafeed: createDatafeed(symbol, () =>
            ordersRef.current.some((o) => o.symbol === symbol && (o.status === "FILLED" || o.status === "PENDING"))
          ),
          symbol: symbol,
          interval: "5",
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
            "go_to_date",
            "order_panel",
            "dom_widget",
            "object_tree_legend_mode",
            "show_object_tree",
            "trading_account_manager",
          ],
          enabled_features: [
            "hide_left_toolbar_by_default",
          ],
          loading_screen: { backgroundColor: "#0d1526", foregroundColor: "#3b82f6" },
        });

        widgetRef.current = widget;

        widget.onChartReady(() => {
          chartReadyRef.current = true;

          // Auto-save on indicator changes
          try {
            widget.subscribe("onAutoSaveNeeded", () => saveChartState(widget));
          } catch { /* */ }

          // Delay to ensure chart series is fully initialized before adding shapes
          setTimeout(() => {
            addOrderLines(widget, ordersRef.current);
            addExecutionShapes(widget, ordersRef.current, executionShapesRef);

            if (pendingScrollRef.current !== null) {
              doScroll(widget, pendingScrollRef.current);
              pendingScrollRef.current = null;
            } else {
              const latestOrder = [...ordersRef.current]
                .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
              if (latestOrder) {
                const t = new Date(latestOrder.fill_time || latestOrder.created_at).getTime() / 1000;
                doScroll(widget, t);
              }
            }
          }, 300);
        });
      }

      // Check if charting library is already loaded
      const existingTV = (window as any).TradingView; // eslint-disable-line @typescript-eslint/no-explicit-any
      let isCorrectLib = false;
      try { isCorrectLib = typeof existingTV?.version === "function" && existingTV.version().includes("v27"); } catch { /* */ }

      if (isCorrectLib) {
        initWidget();
      } else {
        const script = document.createElement("script");
        script.src = "/tradingview/charting_library.standalone.js";
        script.async = true;
        script.onload = () => initWidget();
        script.onerror = (e) => console.error("[BenchmarkChart] script load error:", e);
        document.head.appendChild(script);
      }

      return () => {
        if (saveTimerRef.current) {
          clearInterval(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        if (widgetRef.current) {
          saveChartState(widgetRef.current);
        }
        chartReadyRef.current = false;
        pendingScrollRef.current = null;
        if (widgetRef.current) {
          try { widgetRef.current.remove(); } catch { /* ignore */ }
          widgetRef.current = null;
        }
      };
    }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-add execution shapes when orders change
    useEffect(() => {
      if (!widgetRef.current || !chartReadyRef.current) return;
      try {
        addExecutionShapes(widgetRef.current, orders, executionShapesRef);
      } catch { /* ignore */ }
    }, [orders]);

    if (!symbol) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          코인을 선택하면 차트가 표시됩니다.
        </div>
      );
    }

    return <div ref={containerRef} className="w-full h-full" />;
  },
);
