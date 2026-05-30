"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "../utils/api";

export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = async (authToken: string) => {
    try {
      const profile = await api.get<User>("/auth/profile");
      setUser(profile);
    } catch (error) {
      console.error("Session restoration failed:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("workflow_token");
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Route protection filter
    if (!loading) {
      const isAuthPage = pathname === "/login" || pathname === "/forgot-password" || pathname === "/";
      
      if (!user && !isAuthPage) {
        router.push("/login");
      } else if (user && isAuthPage) {
        router.push("/dashboard");
      }
    }
  }, [user, loading, pathname]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
      localStorage.setItem("workflow_token", res.token);
      setToken(res.token);
      setUser(res.user);
      router.push("/dashboard");
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("workflow_token");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const refreshProfile = async () => {
    if (token) {
      try {
        const profile = await api.get<User>("/auth/profile");
        setUser(profile);
      } catch (error) {
        console.error("Failed to refresh profile:", error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
