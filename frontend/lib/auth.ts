// Admin access token storage (localStorage). Pure storage helpers — no React.

const TOKEN_KEY = "profit-lab-token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// Fired when the server rejects a token (401) so the UI can drop to logged-out state.
export const AUTH_EXPIRED_EVENT = "auth:expired";

export function notifyAuthExpired(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}
