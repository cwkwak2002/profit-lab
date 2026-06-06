"use client"

import * as React from "react"

import { login as loginApi } from "@/lib/api"
import { AUTH_EXPIRED_EVENT, clearToken, getToken, setToken } from "@/lib/auth"

interface AuthContextValue {
  isAuthenticated: boolean
  /** False until the initial token check (after mount) completes. Guards against flashing logged-out UI. */
  initialized: boolean
  logout: () => void
  /** Run `action` if logged in; otherwise open the login modal and run it after a successful login. */
  guard: (action: () => void) => void
  /** Open the login modal directly (e.g. from a "로그인" header button). */
  openLogin: () => void
}

const AuthContext = React.createContext<AuthContextValue>({
  isAuthenticated: false,
  initialized: false,
  logout: () => {},
  guard: () => {},
  openLogin: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [initialized, setInitialized] = React.useState(false)
  const [modalOpen, setModalOpen] = React.useState(false)
  const pendingAction = React.useRef<(() => void) | null>(null)

  // Initialize from storage after mount (avoids SSR hydration mismatch) and
  // listen for 401-driven expiry from the API layer.
  React.useEffect(() => {
    setIsAuthenticated(!!getToken())
    setInitialized(true)
    const onExpired = () => setIsAuthenticated(false)
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  const logout = React.useCallback(() => {
    clearToken()
    setIsAuthenticated(false)
  }, [])

  const openLogin = React.useCallback(() => setModalOpen(true), [])

  const guard = React.useCallback((action: () => void) => {
    if (getToken()) {
      action()
    } else {
      pendingAction.current = action
      setModalOpen(true)
    }
  }, [])

  const handleSuccess = React.useCallback(() => {
    setIsAuthenticated(true)
    setModalOpen(false)
    const action = pendingAction.current
    pendingAction.current = null
    if (action) action()
  }, [])

  const handleClose = React.useCallback(() => {
    pendingAction.current = null
    setModalOpen(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, initialized, logout, guard, openLogin }}>
      {children}
      {modalOpen && <LoginModal onClose={handleClose} onSuccess={handleSuccess} />}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return React.useContext(AuthContext)
}

// --- Login modal ---

function LoginModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const { access_token } = await loginApi(username, password)
      setToken(access_token)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: 340,
          padding: 28,
          background: "var(--px-panel)",
          border: "1px solid var(--px-border)",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--px-white)",
          }}
        >
          로그인
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          아이디
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={inputStyle}
          />
        </label>

        {error && (
          <div style={{ color: "#ff5555", fontSize: 12, lineHeight: 1.4 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onClose} disabled={submitting} style={btnSecondary}>
            취소
          </button>
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? "확인 중…" : "로그인"}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: "var(--px-black)",
  border: "1px solid var(--px-border)",
  borderRadius: 8,
  color: "var(--px-white)",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  outline: "none",
}

const btnPrimary: React.CSSProperties = {
  flex: 1,
  padding: "10px 0",
  background: "var(--px-blue)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
}

const btnSecondary: React.CSSProperties = {
  flex: 1,
  padding: "10px 0",
  background: "transparent",
  border: "1px solid var(--px-border)",
  borderRadius: 8,
  color: "var(--px-white)",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
}
