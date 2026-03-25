"use client"

import { useEffect, useRef } from "react"

const PATTERN = [
  0,0,1,1,1,1,0,0,
  0,1,1,1,1,1,1,0,
  1,1,0,1,1,0,1,1,
  1,1,1,1,1,1,1,1,
  1,1,0,1,1,0,1,1,
  1,1,1,0,0,1,1,1,
  0,1,1,1,1,1,1,0,
  0,0,1,1,1,1,0,0,
]

export function PixelCoin({ size = 24 }: { size?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const cellSize = Math.floor(size / 8)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ""
    PATTERN.forEach((on) => {
      const d = document.createElement("div")
      d.style.background = on ? "#ffe000" : "transparent"
      el.appendChild(d)
    })
  }, [])

  return (
    <div
      ref={ref}
      style={{
        width: size,
        height: size,
        display: "grid",
        gridTemplateColumns: `repeat(8, ${cellSize}px)`,
        gridTemplateRows: `repeat(8, ${cellSize}px)`,
        animation: "coin-spin 1.2s steps(1) infinite",
        flexShrink: 0,
      }}
    />
  )
}
