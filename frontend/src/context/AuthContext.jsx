import React, { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("gttc_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("gttc_token"));

  const login = (payload) => {
    setUser(payload.user);
    setToken(payload.token);
    localStorage.setItem("gttc_user", JSON.stringify(payload.user));
    localStorage.setItem("gttc_token", payload.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("gttc_user");
    localStorage.removeItem("gttc_token");
  };

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAdmin: user?.role === "ADMIN",
      needsVerification: user?.role === "USER" && !user?.verified,
    }),
    [user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
