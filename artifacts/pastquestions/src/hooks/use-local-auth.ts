import { useState, useEffect, useCallback } from "react";

interface AuthUser {
  id: string;
  username: string;
  role: string;
  firstName?: string | null;
  profileImageUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

let globalState: AuthState = { user: null, isAuthenticated: false, isLoading: true };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

async function fetchUser() {
  try {
    const r = await fetch("/api/auth/user", { credentials: "include" });
    if (r.ok) {
      const data = await r.json();
      globalState = {
        user: data.user || null,
        isAuthenticated: !!data.user,
        isLoading: false,
      };
    } else {
      globalState = { user: null, isAuthenticated: false, isLoading: false };
    }
  } catch {
    globalState = { user: null, isAuthenticated: false, isLoading: false };
  }
  notify();
}

// Kick off initial fetch
fetchUser();

export function useLocalAuth() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const update = () => forceUpdate(n => n + 1);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json();
    if (r.ok) {
      await fetchUser();
      return null;
    }
    return data.error || "Login failed";
  }, []);

  const register = useCallback(async (username: string, email: string, password: string): Promise<string | null> => {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await r.json();
    if (r.ok) {
      await fetchUser();
      return null;
    }
    return data.error || "Registration failed";
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    globalState = { user: null, isAuthenticated: false, isLoading: false };
    notify();
    window.location.href = "/login";
  }, []);

  return { ...globalState, login, register, logout };
}
