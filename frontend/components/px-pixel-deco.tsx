"use client";

/**
 * @component PxPixelDeco
 * @description Small pixel-art SVG decorations for page headers.
 * Each variant is an 8-bit style illustration that communicates the page's
 * purpose at a glance, reinforcing the pixel-retro visual identity.
 *
 * Variants:
 *  - "chart"   — Bar chart (Backtest Results)
 *  - "trophy"  — Podium/rank (Leaderboard)
 *  - "brain"   — Circuit/AI (Model Detail)
 *  - "coin"    — Candle chart (Coin Detail)
 *  - "lab"     — Beaker/flask (Generic / fallback)
 *
 * @design-credit Frontend design by angrybear
 */

type DecoVariant = "chart" | "trophy" | "brain" | "coin" | "lab";

interface PxPixelDecoProps {
  variant: DecoVariant;
  size?: number;
}

/* Each pixel is size/16 of the canvas — grid is 16×16 */
function Px({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return <rect x={x * s} y={y * s} width={s} height={s} fill={color} />;
}

/* ── Variants ────────────────────────────────────────────────────────────── */

/* Bar chart — represents backtest results / performance data */
function DecoChart({ s }: { s: number }) {
  const cyan   = "#00eeff";
  const green  = "#00ff7f";
  const border = "#3355ff";
  const dim    = "#1a1a4e";
  // bars: col, height, color
  const bars: [number, number, string][] = [
    [2, 4,  dim],
    [4, 7,  border],
    [6, 10, cyan],
    [8, 14, cyan],
    [10, 9, green],
    [12, 12, green],
  ];
  return (
    <>
      {/* floor */}
      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(x => <Px key={x} x={x} y={14} s={s} color={border} />)}
      {/* bars */}
      {bars.map(([col, h, color]) =>
        Array.from({ length: h }).map((_, i) => (
          <Px key={`${col}-${i}`} x={col} y={14 - 1 - i} s={s} color={color} />
        ))
      )}
      {/* top glow on tallest bar */}
      <Px x={8} y={0} s={s} color={`${cyan}88`} />
      <Px x={8} y={1} s={s} color={`${cyan}44`} />
    </>
  );
}

/* Podium/trophy — leaderboard */
function DecoTrophy({ s }: { s: number }) {
  const yellow = "#ffe000";
  const gold   = "#886600";
  const silver = "#8888aa";
  const border = "#3355ff";
  // cup body (col, row)
  const cup: [number, number, string][] = [
    // rim
    [5,2,yellow],[6,2,yellow],[7,2,yellow],[8,2,yellow],[9,2,yellow],[10,2,yellow],
    // sides
    [4,3,yellow],[11,3,yellow],[4,4,yellow],[11,4,yellow],[4,5,yellow],[11,5,yellow],
    // bottom taper
    [5,6,yellow],[6,6,yellow],[7,6,yellow],[8,6,yellow],[9,6,yellow],[10,6,yellow],
    [6,7,yellow],[7,7,yellow],[8,7,yellow],[9,7,yellow],
    // stem
    [7,8,gold],[8,8,gold],[7,9,gold],[8,9,gold],
    // base
    [5,10,gold],[6,10,gold],[7,10,gold],[8,10,gold],[9,10,gold],[10,10,gold],
    // inner fill
    [5,3,`${yellow}66`],[6,3,`${yellow}66`],[7,3,`${yellow}66`],[8,3,`${yellow}66`],[9,3,`${yellow}66`],[10,3,`${yellow}66`],
    [5,4,`${yellow}44`],[6,4,`${yellow}44`],[7,4,`${yellow}44`],[8,4,`${yellow}44`],[9,4,`${yellow}44`],[10,4,`${yellow}44`],
    [5,5,`${yellow}44`],[6,5,`${yellow}44`],[7,5,`${yellow}44`],[8,5,`${yellow}44`],[9,5,`${yellow}44`],[10,5,`${yellow}44`],
    // star
    [7,4,yellow],[8,4,yellow],
    // handles
    [3,3,silver],[3,4,silver],[12,3,silver],[12,4,silver],
    // podium
    [6,12,border],[7,12,border],[8,12,border],[9,12,border],
    [5,13,border],[6,13,border],[7,13,border],[8,13,border],[9,13,border],[10,13,border],
    [4,14,border],[5,14,border],[6,14,border],[7,14,border],[8,14,border],[9,14,border],[10,14,border],[11,14,border],
  ];
  return <>{cup.map(([x,y,color], i) => <Px key={`${x}-${y}-${i}`} x={x} y={y} s={s} color={color} />)}</>;
}

/* Circuit/brain — AI model detail */
function DecoBrain({ s }: { s: number }) {
  const pink   = "#ff2d78";
  const cyan   = "#00eeff";
  const border = "#3355ff";
  const dim    = "#3355ff88";
  const nodes: [number, number, string][] = [
    // circuit paths
    [2,4,dim],[3,4,dim],[4,4,border],[5,4,dim],[6,4,dim],
    [2,8,dim],[3,8,dim],[4,8,border],[5,8,dim],[6,8,dim],
    [8,4,dim],[9,4,dim],[10,4,border],[11,4,dim],[12,4,dim],
    [8,8,dim],[9,8,dim],[10,8,border],[11,8,dim],[12,8,dim],
    [7,2,dim],[7,3,dim],[7,4,border],[7,5,dim],[7,6,border],[7,7,dim],[7,8,border],[7,9,dim],[7,10,dim],
    [4,4,pink],[4,8,pink],[10,4,pink],[10,8,pink],
    // central node
    [6,5,cyan],[7,5,cyan],[8,5,cyan],
    [6,6,cyan],[7,6,pink],[8,6,cyan],
    [6,7,cyan],[7,7,cyan],[8,7,cyan],
    // corner nodes
    [2,2,border],[2,12,border],[12,2,border],[12,12,border],
    // lines to corners
    [2,3,dim],[3,2,dim],[11,2,dim],[12,3,dim],[3,12,dim],[2,11,dim],[11,12,dim],[12,11,dim],
    // data flow dots
    [5,11,`${cyan}88`],[9,11,`${cyan}88`],[5,1,`${cyan}88`],[9,1,`${cyan}88`],
  ];
  return <>{nodes.map(([x,y,color], i) => <Px key={`${x}-${y}-${i}`} x={x} y={y} s={s} color={color} />)}</>;
}

/* Candle chart — coin detail */
function DecoCoin({ s }: { s: number }) {
  const green  = "#00ff7f";
  const red    = "#ff3333";
  const cyan   = "#00eeff";
  const dim    = "#3355ff55";
  // candlesticks: [x, top_wick, body_start, body_end, bot_wick, color]
  const candles: [number,number,number,number,number,string][] = [
    [2,  2, 4, 8, 10, green],
    [5,  3, 5, 9, 11, red],
    [8,  1, 3, 7,  9, green],
    [11, 2, 6,10, 12, green],
    [13, 4, 5, 8, 10, red],
  ];
  return (
    <>
      {/* Grid lines */}
      {[4, 8, 12].map(y => (
        [1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(x => <Px key={`g${x}${y}`} x={x} y={y} s={s} color={dim} />)
      ))}
      {/* Candles */}
      {candles.map(([cx, tw, bs, be, bw, color]) => (
        Array.from({ length: 15 }).map((_, y) => {
          if (y === tw || y === bw) return <Px key={`w${cx}${y}`} x={cx+1} y={y} s={s} color={`${color}88`} />;
          if (y >= bs && y <= be) return <Px key={`b${cx}${y}`} x={cx} y={y} s={s} color={color} />;
          if (y > tw && y < bs) return <Px key={`wt${cx}${y}`} x={cx+1} y={y} s={s} color={color} />;
          if (y > be && y < bw) return <Px key={`wb${cx}${y}`} x={cx+1} y={y} s={s} color={color} />;
          return null;
        })
      ))}
      {/* Moving average line */}
      {[[2,7],[4,6],[6,5],[8,4],[10,6],[12,8],[13,7]].map(([x,y]) =>
        <Px key={`ma${x}${y}`} x={x} y={y} s={s} color={cyan} />
      )}
    </>
  );
}

/* Lab beaker — generic fallback */
function DecoLab({ s }: { s: number }) {
  const cyan   = "#00eeff";
  const pink   = "#ff2d78";
  const border = "#3355ff";
  const pixels: [number, number, string][] = [
    // beaker outline
    [6,1,border],[7,1,border],[8,1,border],[9,1,border],
    [6,2,border],[9,2,border],[6,3,border],[9,3,border],
    [5,4,border],[9,4,border],[4,5,border],[9,5,border],
    [3,6,border],[9,6,border],[3,7,border],[9,7,border],
    [3,8,border],[9,8,border],
    [3,9,border],[4,9,border],[5,9,border],[6,9,border],[7,9,border],[8,9,border],[9,9,border],
    // liquid
    [4,7,`${cyan}88`],[5,7,`${cyan}88`],[6,7,`${cyan}88`],[7,7,`${cyan}88`],[8,7,`${cyan}88`],
    [4,8,cyan],[5,8,cyan],[6,8,cyan],[7,8,cyan],[8,8,cyan],
    // bubbles
    [5,5,`${pink}88`],[7,6,`${pink}88`],[6,4,`${pink}44`],
    // glow
    [6,10,`${cyan}44`],[7,10,`${cyan}44`],[8,10,`${cyan}44`],
  ];
  return <>{pixels.map(([x,y,color], i) => <Px key={`${x}-${y}-${i}`} x={x} y={y} s={s} color={color} />)}</>;
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export function PxPixelDeco({ variant, size = 48 }: PxPixelDecoProps) {
  const s = size / 16;  // pixel size in the 16×16 grid
  const Inner = {
    chart:  DecoChart,
    trophy: DecoTrophy,
    brain:  DecoBrain,
    coin:   DecoCoin,
    lab:    DecoLab,
  }[variant];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ imageRendering: "pixelated", flexShrink: 0 }}
      aria-hidden="true"
    >
      <Inner s={s} />
    </svg>
  );
}
