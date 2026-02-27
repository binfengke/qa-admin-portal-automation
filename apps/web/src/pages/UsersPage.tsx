import React from "react";
import { apiFetch, ApiError } from "../api/client";
import type { User, UserRole } from "../api/types";
import { useAuth } from "../auth/AuthContext";

type UsersListResponse = { items: User[]; page: number; pageSize: number; total: number };

export function UsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [q, setQ] = React.useState("");
  const [data, setData] = React.useState<UsersListResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [createEmail, setCreateEmail] = React.useState("");
  const [createPassword, setCreatePassword] = React.useState("password123");
  const [createRole, setCreateRole] = React.useState<UserRole>("viewer");

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<UsersListResponse>(
        `/api/users?q=${encodeURIComponent(q)}&page=1&pageSize=20&sort=createdAt:desc`,
      );
      setData(res);
    } catch (e) {
      if (e instanceof ApiError) setError(`${e.code}: ${e.message}`);
      else setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [q]);

  React.useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="stack">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>Users</div>
            <div className="muted">Search / sort / RBAC-enabled CRUD</div>
          </div>

          <div className="row" style={{ width: 360 }}>
            <input
              className="input"
              data-testid="users-search"
              placeholder="Search email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn" onClick={() => void fetchUsers()}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <div className="card stack">
          <div style={{ fontWeight: 700 }}>Create user</div>
          <div className="row" style={{ gap: 10 }}>
            <input
              className="input"
              data-testid="create-user-email"
              placeholder="email@example.com"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />
            <select
              className="select"
              data-testid="create-user-role"
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value as UserRole)}
              style={{ width: 160 }}
            >
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <input
              className="input"
              data-testid="create-user-password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              type="password"
            />
            <button
              className="btn primary"
              data-testid="create-user-button"
              onClick={async () => {
                setError(null);
                try {
                  await apiFetch("/api/users", {
                    method: "POST",
                    body: JSON.stringify({
                      email: createEmail,
                      password: createPassword,
                      role: createRole,
                    }),
                  });
                  setCreateEmail("");
                  await fetchUsers();
                } catch (e) {
                  if (e instanceof ApiError) setError(`${e.code}: ${e.message}`);
                  else setError("Create user failed");
                }
              }}
            >
              Create
            </button>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            Admin-only. Viewer should not see this form.
          </div>
        </div>
      ) : null}

      <div className="card">
        {error ? <div className="error">{error}</div> : null}
        {loading ? (
          <div className="muted">Loading…</div>
        ) : (
          <table data-testid="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((u) => (
                <tr key={u.id} data-testid={`user-row-${u.id}`}>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge">{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.status === "active" ? "ok" : "danger"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="muted">{new Date(u.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          {data ? `${data.total} total` : null}
        </div>
      </div>
    </div>
  );
}

