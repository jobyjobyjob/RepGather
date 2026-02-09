import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { apiRequest, getQueryFn } from '@/lib/query-client';

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  ageRange?: string | null;
  gender?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, password: string, ageRange: string, gender: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      const data = await res.json();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    setUser(data);
  }, []);

  const register = useCallback(async (username: string, displayName: string, password: string, ageRange: string, gender: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { username, displayName, password, ageRange, gender });
    const data = await res.json();
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await apiRequest("DELETE", "/api/auth/account");
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading,
    login,
    register,
    logout,
    deleteAccount,
  }), [user, isLoading, login, register, logout, deleteAccount]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
