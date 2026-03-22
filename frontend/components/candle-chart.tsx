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
  strategy?: string;
}

function tsToSeconds(ms: number): Time {
  return (ms / 1000) as Time;
}

function isoToSeconds(iso: string): Time {
  return (new Date(iso + "Z").getTime() / 1000) as Time;
}

export const CandleChart = forwardRef<CandleChartHandle, Props>(
  function CandleChart({ candles, trades, strategy = "rsi_divergence" }, ref) {
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
        SL: "SL", TP2: "TP2", FIXED_TP: "TP+3.5%", BE: "BE", EMA_CROSS: "EMA Cross", TRAIL: "TRAIL", TIMEOUT: "TIMEOUT", NO_DATA: "NO_DATA",
      };
      const riskLabels: Record<string, string> = {
        RISK_EMA_GAP: "EMA Gap",
        RISK_TRAPPED: "EMA Trap",
        RISK_ADX: "ADX Low",
        RISK_BB_EXPANSION: "BB Filter",
        RISK_SPIKE: "Spike CD",
        RISK_BTC_CRASH: "BTC Crash",
        RISK_RSI_INUNDATION: "RSI Flood",
        RISK_DEAD_ZONE: "Dead Zone",
      };
      const markers = trades.flatMap((t) => {
        const result: Array<{
          time: Time; position: "belowBar" | "aboveBar";
          color: string; shape: "arrowUp" | "arrowDown" | "circle"; text: string;
        }> = [];

        const isRiskBlocked = t.exit_reason.startsWith("RISK_");

        if (isRiskBlocked) {
          result.push({
            time: isoToSeconds(t.entry_time),
            position: "belowBar",
            color: "#6e7681",
            shape: "circle",
            text: riskLabels[t.exit_reason] || t.exit_reason,
          });
          return result;
        }

        // Entry
        const isShort = t.side === "short";
        result.push({
          time: isoToSeconds(t.entry_time),
          position: isShort ? "aboveBar" : "belowBar",
          color: isShort ? "#ef4444" : "#22c55e",
          shape: isShort ? "arrowDown" : "arrowUp",
          text: isShort ? "Short" : "Long",
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
          : t.exit_reason === "FIXED_TP" ? "#22c55e"
          : t.exit_reason === "BE" ? "#f59e0b"
          : t.exit_reason === "EMA_CROSS" ? "#a371f7"
          : t.exit_reason === "TRAIL" ? "#22c55e"
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

      // --- Strategy-specific indicators ---
      if (strategy === "rsi_divergence") {
        // RSI sub-pane with 30/70 lines
        const rsiPane = chart.addPane();

        const rsiSeries = rsiPane.addSeries(LineSeries, {
          color: "#a78bfa",
          lineWidth: 2,
          priceScaleId: "right",
          lastValueVisible: true,
          priceLineVisible: false,
        });
        const rsiData: LineData[] = candles
          .filter((c) => c.rsi != null)
          .map((c) => ({ time: tsToSeconds(c.timestamp), value: c.rsi! }));
        rsiSeries.setData(rsiData);

        const rsiTimestamps = candles.filter((c) => c.rsi != null).map((c) => tsToSeconds(c.timestamp));

        // RSI 30 line
        const rsi30 = rsiPane.addSeries(LineSeries, {
          color: "rgba(34,197,94,0.4)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceScaleId: "right",
          lastValueVisible: false,
          priceLineVisible: false,
        });
        rsi30.setData(rsiTimestamps.map((t) => ({ time: t, value: 30 })));

        // RSI 70 line
        const rsi70 = rsiPane.addSeries(LineSeries, {
          color: "rgba(239,68,68,0.4)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceScaleId: "right",
          lastValueVisible: false,
          priceLineVisible: false,
        });
        rsi70.setData(rsiTimestamps.map((t) => ({ time: t, value: 70 })));

      } else if (strategy === "ema_trend") {
        // EMA 50 overlay on main chart
        const ema50Series = chart.addSeries(LineSeries, {
          color: "#f59e0b",
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const ema50Data: LineData[] = candles
          .filter((c) => c.ema50 != null)
          .map((c) => ({ time: tsToSeconds(c.timestamp), value: c.ema50! }));
        ema50Series.setData(ema50Data);

        // EMA 200 overlay on main chart
        const ema200Series = chart.addSeries(LineSeries, {
          color: "#3b82f6",
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const ema200Data: LineData[] = candles
          .filter((c) => c.ema200 != null)
          .map((c) => ({ time: tsToSeconds(c.timestamp), value: c.ema200! }));
        ema200Series.setData(ema200Data);

        // ADX sub-pane
        const adxPane = chart.addPane();

        const adxSeries = adxPane.addSeries(LineSeries, {
          color: "#f97316",
          lineWidth: 2,
          priceScaleId: "right",
          lastValueVisible: true,
          priceLineVisible: false,
        });
        const adxData: LineData[] = candles
          .filter((c) => c.adx != null)
          .map((c) => ({ time: tsToSeconds(c.timestamp), value: c.adx! }));
        adxSeries.setData(adxData);

        const adxTimestamps = candles.filter((c) => c.adx != null).map((c) => tsToSeconds(c.timestamp));

        // ADX 20 line
        const adx20 = adxPane.addSeries(LineSeries, {
          color: "rgba(239,68,68,0.4)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceScaleId: "right",
          lastValueVisible: false,
          priceLineVisible: false,
        });
        adx20.setData(adxTimestamps.map((t) => ({ time: t, value: 20 })));

        // ADX 25 line
        const adx25 = adxPane.addSeries(LineSeries, {
          color: "rgba(34,197,94,0.4)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceScaleId: "right",
          lastValueVisible: false,
          priceLineVisible: false,
        });
        adx25.setData(adxTimestamps.map((t) => ({ time: t, value: 25 })));

      } else if (strategy === "bb_squeeze") {
        // BB upper/mid/lower overlays on main chart
        const bbUpperSeries = chart.addSeries(LineSeries, {
          color: "rgba(59,130,246,0.6)",
          lineWidth: 1,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const bbUpperData: LineData[] = candles
          .filter((c) => c.bb_upper != null)
          .map((c) => ({ time: tsToSeconds(c.timestamp), value: c.bb_upper! }));
        bbUpperSeries.setData(bbUpperData);

        const bbMidSeries = chart.addSeries(LineSeries, {
          color: "rgba(156,163,175,0.5)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const bbMidData: LineData[] = candles
          .filter((c) => c.bb_mid != null)
          .map((c) => ({ time: tsToSeconds(c.timestamp), value: c.bb_mid! }));
        bbMidSeries.setData(bbMidData);

        const bbLowerSeries = chart.addSeries(LineSeries, {
          color: "rgba(59,130,246,0.6)",
          lineWidth: 1,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const bbLowerData: LineData[] = candles
          .filter((c) => c.bb_lower != null)
          .map((c) => ({ time: tsToSeconds(c.timestamp), value: c.bb_lower! }));
        bbLowerSeries.setData(bbLowerData);

        // BB Width sub-pane
        const bbWidthPane = chart.addPane();

        const bbWidthSeries = bbWidthPane.addSeries(LineSeries, {
          color: "#8b5cf6",
          lineWidth: 2,
          priceScaleId: "right",
          lastValueVisible: true,
          priceLineVisible: false,
        });
        const bbWidthData: LineData[] = candles
          .filter((c) => c.bb_width != null)
          .map((c) => ({ time: tsToSeconds(c.timestamp), value: c.bb_width! }));
        bbWidthSeries.setData(bbWidthData);
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
    }, [candles, trades, strategy]);

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
