import React from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";
import { ProjectsPage } from "./pages/ProjectsPage";

function Layout(props: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="grid">
        <div className="card nav">
          <div className="stack" style={{ gap: 6 }}>
            <div style={{ fontWeight: 700 }}>QA Admin Portal</div>
            <div className="muted" data-testid="current-user">
              {user?.email} · {user?.role}
            </div>
          </div>

          <div className="stack" style={{ marginTop: 12 }}>
            <NavLink to="/users" data-testid="nav-users">
              Users
            </NavLink>
            <NavLink to="/projects" data-testid="nav-projects">
              Projects
            </NavLink>
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              className="btn danger"
              data-testid="logout"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="stack">{props.children}</div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading, reload } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="container">
        <div className="card">Loading…</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/users" replace />
          ) : (
            <LoginPage
              onLoggedIn={async () => {
                await reload();
                navigate("/users");
              }}
            />
          )
        }
      />

      <Route
        path="/*"
        element={
          user ? (
            <Layout>
              <Routes>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="*" element={<Navigate to="/users" replace />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

