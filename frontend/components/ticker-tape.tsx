"use client";

const ITEMS = [
  "BTC/USDT +2.3%", "ETH/USDT +1.8%", "SOL/USDT +4.1%",
  "RSI DIV WIN RATE 68%", "EMA TREND +24.7%", "BB SQUEEZE ACTIVE",
  "NEW HIGH: 142 TRADES", "PROFIT LAB v0.1.0",
];

export function TickerTape() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div style={{
      overflow: "hidden",
      background: "var(--px-black)",
      borderBottom: "1px solid var(--px-border)",
      padding: "7px 0",
      flexShrink: 0,
    }}>
      <style>{`
        @keyframes ticker-move {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-inner {
          animation: ticker-move 20s linear infinite;
        }
      `}</style>
      <div
        className="ticker-inner"
        style={{ display: "flex", gap: 40, whiteSpace: "nowrap", width: "max-content" }}
      >
        {doubled.map((t, i) => {
          const parts = t.split(" ");
          const last = parts[parts.length - 1];
          const isPos = last.startsWith("+");
          const isNeg = last.startsWith("-");
          return (
            <span key={i} style={{ fontFamily: "var(--ff-mono, monospace)", fontSize: 11, color: "var(--px-grey-mid)", letterSpacing: "0.02em" }}>
              {(isPos || isNeg)
                ? <>{parts.slice(0, -1).join(" ")}{" "}<span style={{ color: isPos ? "var(--px-green)" : "var(--px-red)" }}>{last}</span>{"  ·"}</>
                : <>{t}{"  ·"}</>
              }
            </span>
          );
        })}
      </div>
    </div>
  );
}
