"use client";

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type CandlestickData,
  type Time,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import type { Candle, BenchmarkOrder } from "@/lib/api";

export interface BenchmarkChartHandle {
  scrollToTime: (timeSeconds: number) => void;
}

interface Props {
  candles: Candle[];
  orders: BenchmarkOrder[];
}

// lightweight-charts renders UTC timestamps as-is on the time axis.
// To show KST (UTC+9) on the chart, we shift all timestamps by +9 hours.
const KST_OFFSET_SEC = 9 * 3600;

function tsToSeconds(ms: number): Time {
  return (ms / 1000 + KST_OFFSET_SEC) as Time;
}

function isoToSeconds(iso: string): Time {
  return (new Date(iso).getTime() / 1000 + KST_OFFSET_SEC) as Time;
}

export const BenchmarkChart = forwardRef<BenchmarkChartHandle, Props>(
  function BenchmarkChart({ candles, orders }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    const scrollToTime = useCallback((timeSeconds: number) => {
      const chart = chartRef.current;
      if (!chart) return;
      // Apply same KST offset so scroll target matches shifted chart data
      const kst = timeSeconds + KST_OFFSET_SEC;
      const from = (kst - 3600 * 12) as Time;
      const to = (kst + 3600 * 12) as Time;
      chart.timeScale().setVisibleRange({ from, to });
    }, []);

    useImperativeHandle(ref, () => ({ scrollToTime }), [scrollToTime]);

    useEffect(() => {
      const el = containerRef.current;
      if (!el || candles.length === 0) return;

      const chart = createChart(el, {
        width: el.clientWidth,
        height: el.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: "#0d1526" },
          textColor: "#6e7fa0",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "#182642" },
          horzLines: { color: "#182642" },
        },
        crosshair: { mode: CrosshairMode.Normal },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: "#223557",
        },
        rightPriceScale: {
          borderColor: "#223557",
        },
      });
      chartRef.current = chart;

      // --- Candle series ---
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#4ade80",
        wickDownColor: "#f87171",
      });

      const candleData: CandlestickData[] = candles.map((c) => ({
        time: tsToSeconds(c.timestamp),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candleSeries.setData(candleData);

      // --- TP/SL horizontal lines for FILLED orders ---
      for (const order of orders) {
        if (order.status !== "FILLED") continue;

        const isLong = order.side === "long";

        // Entry price line
        const entrySeries = chart.addSeries(LineSeries, {
          color: "rgba(156,163,175,0.5)",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const entryTime = isoToSeconds(order.fill_time || order.created_at);
        const now = (Date.now() / 1000) as Time;
        entrySeries.setData([
          { time: entryTime, value: order.entry_price },
          { time: now, value: order.entry_price },
        ]);

        // TP line
        const tpSeries = chart.addSeries(LineSeries, {
          color: "rgba(34,197,94,0.4)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        tpSeries.setData([
          { time: entryTime, value: order.tp_price },
          { time: now, value: order.tp_price },
        ]);

        // SL line
        const slSeries = chart.addSeries(LineSeries, {
          color: "rgba(239,68,68,0.4)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        slSeries.setData([
          { time: entryTime, value: order.sl_price },
          { time: now, value: order.sl_price },
        ]);

        // TP2 line if exists
        if (order.tp2_price) {
          const tp2Series = chart.addSeries(LineSeries, {
            color: "rgba(34,197,94,0.25)",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          tp2Series.setData([
            { time: entryTime, value: order.tp2_price },
            { time: now, value: order.tp2_price },
          ]);
        }
      }

      // --- Order markers ---
      const reasonColors: Record<string, string> = {
        TP: "#22c55e", TP2: "#22c55e", SL: "#ef4444", SL_BE: "#f59e0b",
        TIMEOUT_6H: "#6b7280", CANCEL_30M: "#6b7280", MANUAL: "#6b7280",
      };
      const reasonLabels: Record<string, string> = {
        TP: "TP", TP2: "TP2", SL: "SL", SL_BE: "SL(BE)",
        TIMEOUT_6H: "6H", CANCEL_30M: "30M", MANUAL: "DEL",
      };

      const markers: Array<{
        time: Time; position: "belowBar" | "aboveBar";
        color: string; shape: "arrowUp" | "arrowDown" | "circle"; text: string;
      }> = [];

      for (const order of orders) {
        const isShort = order.side === "short";

        // Order creation (PENDING submission)
        markers.push({
          time: isoToSeconds(order.created_at),
          position: "belowBar",
          color: "#6b7280",
          shape: "circle",
          text: `${isShort ? "S" : "L"} 주문`,
        });

        // Fill
        if (order.fill_time) {
          markers.push({
            time: isoToSeconds(order.fill_time),
            position: isShort ? "aboveBar" : "belowBar",
            color: isShort ? "#ef4444" : "#22c55e",
            shape: isShort ? "arrowDown" : "arrowUp",
            text: isShort ? "Short" : "Long",
          });
        }

        // TP1 hit (dual TP)
        if (order.tp1_hit && order.tp1_pnl !== null) {
          // TP1 time not stored separately — approximate from close_time or skip
        }

        // Close
        if (order.close_time && order.close_reason) {
          markers.push({
            time: isoToSeconds(order.close_time),
            position: "aboveBar",
            color: reasonColors[order.close_reason] || "#6b7280",
            shape: "circle",
            text: reasonLabels[order.close_reason] || order.close_reason,
          });
        }
      }

      markers.sort((a, b) => (a.time as number) - (b.time as number));
      if (markers.length > 0) {
        createSeriesMarkers(candleSeries, markers);
      }

      // Resize observer
      const observer = new ResizeObserver(() => {
        chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
      });
      observer.observe(el);

      return () => {
        observer.disconnect();
        chart.remove();
        chartRef.current = null;
      };
    }, [candles, orders]);

    if (candles.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          코인을 선택하면 차트가 표시됩니다.
        </div>
      );
    }

    return <div ref={containerRef} className="w-full h-full" />;
  },
);
