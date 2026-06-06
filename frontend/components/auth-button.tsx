"use client"

import { useAuth } from "@/design-system/providers/auth-provider"

const style: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "transparent",
  border: "2px solid var(--px-border, #3355ff)",
  color: "var(--px-white, #f0f0ff)",
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 8,
  letterSpacing: 1,
  padding: "5px 8px",
  cursor: "pointer",
  lineHeight: 1,
}

export function AuthButton() {
  const { isAuthenticated, logout, openLogin } = useAuth()
  return (
    <button onClick={isAuthenticated ? logout : openLogin} style={style}>
      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
        {isAuthenticated ? "lock_open" : "lock"}
      </span>
      {isAuthenticated ? "LOGOUT" : "LOGIN"}
    </button>
  )
}
