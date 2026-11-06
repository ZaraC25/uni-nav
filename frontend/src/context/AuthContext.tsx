import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { UserResponse } from "../types";

interface AuthContextValue {
  user: UserResponse | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("uninav_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      localStorage.removeItem("uninav_token");
      localStorage.removeItem("uninav_user");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (username: string, password: string) => {
    const token = await api.login({ username, password });
    localStorage.setItem("uninav_token", token.access_token);
    const me = await api.me();
    setUser(me);
  };

  const register = async (username: string, password: string) => {
    await api.register({ username, password });
    const token = await api.login({ username, password });
    localStorage.setItem("uninav_token", token.access_token);
    const me = await api.me();
    setUser(me);
  };

  const logout = () => {
    localStorage.removeItem("uninav_token");
    localStorage.removeItem("uninav_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
