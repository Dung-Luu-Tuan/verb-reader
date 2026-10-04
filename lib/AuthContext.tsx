"use client";

import { AuthContextType, User } from "@/types/user";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  useEffect(() => {
    // Attempt silent refresh on initial load
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/auth/refresh", {
          method: "POST", // Adjust to GET if your backend requires GET for refresh
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Essential for sending the HttpOnly refresh token cookie
        });

        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.access_token);

          const meRes = await fetch('http://localhost:3001/api/auth/me', {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });
          const meData = await meRes.json();
          setUser(meData.user);
        } else {
          setAccessToken(null);
        }
      } catch (error) {
        console.error("Silent refresh failed:", error);
        setAccessToken(null);
      } finally {
        setIsLoadingContext(false);
      }
    };

    checkAuth();
  }, []);

  const login = (token: string, user: User) => {
    setAccessToken(token);
    setUser(user);
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
  };

  if (isLoadingContext) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium animate-pulse">Đang tải dữ liệu phiên bản...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ accessToken, user, isLoadingContext, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
