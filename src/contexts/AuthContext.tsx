import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface AuthUser { username: string; token: string; }
interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, invite?: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 启动时从 localStorage 恢复 session
  useEffect(() => {
    const stored = localStorage.getItem('ai_studio_token');
    const name = localStorage.getItem('ai_studio_user');
    if (stored && name) {
      // 验证 token 是否还有效
      fetch(`${API}/api/auth/verify`, { headers: { Authorization: `Bearer ${stored}` } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setUser({ username: data.username, token: stored }))
        .catch(() => { localStorage.removeItem('ai_studio_token'); localStorage.removeItem('ai_studio_user'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const r = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || '登录失败');
    localStorage.setItem('ai_studio_token', data.token);
    localStorage.setItem('ai_studio_user', data.username);
    setUser({ username: data.username, token: data.token });
  };

  const register = async (username: string, password: string, invite?: string) => {
    const r = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, invite }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || '注册失败');
    localStorage.setItem('ai_studio_token', data.token);
    localStorage.setItem('ai_studio_user', data.username);
    setUser({ username: data.username, token: data.token });
  };

  const logout = () => {
    localStorage.removeItem('ai_studio_token');
    localStorage.removeItem('ai_studio_user');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
