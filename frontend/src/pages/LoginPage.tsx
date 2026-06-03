import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { client } from "../api/client";
import { useAuthStore } from "../store/useAuthStore";

export function LoginPage() {
  const navigate  = useNavigate();
  const setAuth   = useAuthStore((s) => s.setAuth);

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await client.login(email, password);
      setAuth(data.user as any, data.access_token, data.refresh_token);
      navigate("/projects", { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(detail ?? "Giriş başarısız. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "1rem",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 400,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: "2.5rem 2rem",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: "var(--accent)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.5px",
          }}>
            PF
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>PanelForge</div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Engineering workspace</div>
          </div>
        </div>

        <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.25rem" }}>Giriş Yap</h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label className="field">
            <span>E-posta</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@sirket.com"
            />
          </label>

          <label className="field">
            <span>Şifre</span>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: "2.5rem", width: "100%", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--muted)", fontSize: "0.9rem", padding: 0,
                }}
                tabIndex={-1}
              >
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </label>

          {error && (
            <div style={{
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.3)",
              borderRadius: 8,
              padding: "0.6rem 0.9rem",
              color: "#dc2626",
              fontSize: "0.85rem",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !email || !password}
            style={{ marginTop: "0.25rem", padding: "0.75rem", fontSize: "0.95rem" }}
          >
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
