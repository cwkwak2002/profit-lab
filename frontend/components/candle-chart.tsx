"use client";

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type CandlestickData,
  type LineData,
  type Time,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import type { Candle, Trade } from "@/lib/api";

export interface CandleChartHandle {
  scrollToTime: (timeSeconds: number) => void;
}

interface Props {
  candles: Candle[];
  trades: Trade[];
}

function tsToSeconds(ms: number): Time {
  return (ms / 1000) as Time;
}

function isoToSeconds(iso: string): Time {
  return (new Date(iso + "Z").getTime() / 1000) as Time;
}

export const CandleChart = forwardRef<CandleChartHandle, Props>(
  function CandleChart({ candles, trades }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    const scrollToTime = useCallback((timeSeconds: number) => {
      const chart = chartRef.current;
      if (!chart) return;
      const from = (timeSeconds - 3600 * 6) as Time;
      const to = (timeSeconds + 3600 * 6) as Time;
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
          background: { type: ColorType.Solid, color: "#0f1117" },
          textColor: "#9ca3af",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "#1e2433" },
          horzLines: { color: "#1e2433" },
        },
        crosshair: { mode: CrosshairMode.Normal },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
          borderColor: "#2d3548",
        },
        rightPriceScale: {
          borderColor: "#2d3548",
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

      // --- Trade markers ---
      const exitLabels: Record<string, string> = {
        SL: "SL", TP2: "TP2", BE: "BE", TIMEOUT: "TIMEOUT", NO_DATA: "NO_DATA",
      };
      const markers = trades.flatMap((t) => {
        const result: Array<{
          time: Time; position: "belowBar" | "aboveBar";
          color: string; shape: "arrowUp" | "arrowDown" | "circle"; text: string;
        }> = [];

        // Entry
        result.push({
          time: isoToSeconds(t.entry_time),
          position: "belowBar",
          color: "#22c55e",
          shape: "arrowUp",
          text: "Long",
        });

        // TP1
        if (t.tp1_time) {
          result.push({
            time: isoToSeconds(t.tp1_time),
            position: "aboveBar",
            color: "#3b82f6",
            shape: "circle",
            text: "TP1",
          });
        }

        // Final exit
        const exitColor = t.exit_reason === "SL" ? "#ef4444"
          : t.exit_reason === "TP2" ? "#22c55e"
          : t.exit_reason === "BE" ? "#f59e0b"
          : "#6b7280";
        result.push({
          time: isoToSeconds(t.exit_time),
          position: "aboveBar",
          color: exitColor,
          shape: "arrowDown",
          text: exitLabels[t.exit_reason] || t.exit_reason,
        });

        return result;
      });
      markers.sort((a, b) => (a.time as number) - (b.time as number));
      createSeriesMarkers(candleSeries, markers);

      // --- RSI pane ---
      const rsiPane = chart.addPane();

      const rsiSeries = rsiPane.addSeries(LineSeries, {
        color: "#a78bfa",
        lineWidth: 2,
        priceScaleId: "right",
        lastValueVisible: true,
        priceLineVisible: false,
      });
      const rsiData: LineData[] = candles
        .filter((c) => c.rsi !== null)
        .map((c) => ({ time: tsToSeconds(c.timestamp), value: c.rsi! }));
      rsiSeries.setData(rsiData);

      const rsiTimestamps = candles.filter((c) => c.rsi !== null).map((c) => tsToSeconds(c.timestamp));

      // RSI 30
      const rsi30 = rsiPane.addSeries(LineSeries, {
        color: "rgba(34,197,94,0.4)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceScaleId: "right",
        lastValueVisible: false,
        priceLineVisible: false,
      });
      rsi30.setData(rsiTimestamps.map((t) => ({ time: t, value: 30 })));

      // RSI 70
      const rsi70 = rsiPane.addSeries(LineSeries, {
        color: "rgba(239,68,68,0.4)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceScaleId: "right",
        lastValueVisible: false,
        priceLineVisible: false,
      });
      rsi70.setData(rsiTimestamps.map((t) => ({ time: t, value: 70 })));

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
    }, [candles, trades]);

    if (candles.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          캔들 데이터가 없습니다.
        </div>
      );
    }

    return <div ref={containerRef} className="w-full h-full" />;
  },
);
