import React from "react";
import { apiFetch } from "../api/client";
import type { UserRole } from "../api/types";

export type CurrentUser = { id: string; email: string; role: UserRole } | null;

type AuthContextValue = {
  user: CurrentUser;
  loading: boolean;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<CurrentUser>(null);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    try {
      const res = await apiFetch<{ user: CurrentUser }>("/api/me");
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = React.useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <AuthContext.Provider value={{ user, loading, reload, logout }}>
      {props.children}
    </AuthContext.Provider>
  );
}

