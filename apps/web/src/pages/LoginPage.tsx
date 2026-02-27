import React from "react";
import { apiFetch, ApiError } from "../api/client";

export function LoginPage(props: { onLoggedIn: () => Promise<void> }) {
  const [email, setEmail] = React.useState("admin@example.com");
  const [password, setPassword] = React.useState("admin123");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="card stack">
        <div className="stack" style={{ gap: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 22 }}>Sign in</div>
          <div className="muted">
            Use <span className="badge">admin</span> or <span className="badge">viewer</span> to
            validate RBAC.
          </div>
        </div>

        {error ? <div className="error" data-testid="login-error">{error}</div> : null}

        <div className="stack">
          <label className="muted">Email</label>
          <input
            className="input"
            data-testid="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="stack">
          <label className="muted">Password</label>
          <input
            className="input"
            data-testid="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </div>

        <button
          className="btn primary"
          data-testid="login-submit"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              await apiFetch("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
              });
              await props.onLoggedIn();
            } catch (e) {
              if (e instanceof ApiError) setError(`${e.code}: ${e.message}`);
              else setError("Login failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <div className="muted" style={{ fontSize: 13 }}>
          Tip: viewer can only read lists. admin can create/update/delete.
        </div>
      </div>
    </div>
  );
}

