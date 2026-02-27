import React from "react";
import { apiFetch, ApiError } from "../api/client";
import type { Project } from "../api/types";
import { useAuth } from "../auth/AuthContext";

type ProjectsListResponse = { items: Project[]; page: number; pageSize: number; total: number };

export function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [q, setQ] = React.useState("");
  const [data, setData] = React.useState<ProjectsListResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [createName, setCreateName] = React.useState("");
  const [createKey, setCreateKey] = React.useState("");

  const fetchProjects = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ProjectsListResponse>(
        `/api/projects?q=${encodeURIComponent(q)}&page=1&pageSize=20&sort=createdAt:desc`,
      );
      setData(res);
    } catch (e) {
      if (e instanceof ApiError) setError(`${e.code}: ${e.message}`);
      else setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [q]);

  React.useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="stack">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>Projects</div>
            <div className="muted">List + RBAC-enabled CRUD</div>
          </div>

          <div className="row" style={{ width: 360 }}>
            <input
              className="input"
              data-testid="projects-search"
              placeholder="Search name/key…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn" onClick={() => void fetchProjects()}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <div className="card stack">
          <div style={{ fontWeight: 700 }}>Create project</div>
          <div className="row" style={{ gap: 10 }}>
            <input
              className="input"
              data-testid="create-project-name"
              placeholder="Project name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <input
              className="input"
              data-testid="create-project-key"
              placeholder="KEY"
              value={createKey}
              onChange={(e) => setCreateKey(e.target.value.toUpperCase())}
              style={{ width: 180 }}
            />
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button
              className="btn primary"
              data-testid="create-project-button"
              onClick={async () => {
                setError(null);
                try {
                  await apiFetch("/api/projects", {
                    method: "POST",
                    body: JSON.stringify({
                      name: createName,
                      key: createKey,
                    }),
                  });
                  setCreateName("");
                  setCreateKey("");
                  await fetchProjects();
                } catch (e) {
                  if (e instanceof ApiError) setError(`${e.code}: ${e.message}`);
                  else setError("Create project failed");
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
          <table data-testid="projects-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((p) => (
                <tr key={p.id} data-testid={`project-row-${p.id}`}>
                  <td>{p.name}</td>
                  <td>
                    <span className="badge">{p.key}</span>
                  </td>
                  <td>
                    <span className={`badge ${p.status === "active" ? "ok" : "danger"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="muted">{new Date(p.updatedAt).toLocaleString()}</td>
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

