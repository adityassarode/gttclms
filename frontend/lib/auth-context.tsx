"use client";

import * as React from "react";
import { api, getStoredAuthToken, setStoredAuthToken } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { RegisterPayload, User } from "@/lib/types";

type SignUpPayload = RegisterPayload;

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isReady: boolean;
  signInWithPassword: (
    identifier: string,
    password: string,
  ) => Promise<User | null>;
  signInWithAdminCredentials: (
    username: string,
    password: string,
  ) => Promise<User | null>;
  signUpWithPassword: (payload: SignUpPayload) => Promise<User | null>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const noopUser = async () => null;

const defaultValue: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isReady: false,
  signInWithPassword: noopUser,
  signInWithAdminCredentials: noopUser,
  signUpWithPassword: noopUser,
  signInWithGoogle: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
};

const AuthContext = React.createContext<AuthContextValue>(defaultValue);

function normalizeRedirectPath(path?: string) {
  if (!path) {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

async function getSupabaseAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  return data.session?.access_token ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  const setSessionUser = React.useCallback(
    (profile: User | null, token?: string | null) => {
      if (token !== undefined) {
        setStoredAuthToken(token || null);
      }
      setUser(profile);
    },
    [],
  );

  const signInWithPassword = React.useCallback(
    async (identifier: string, password: string) => {
      const response = await api.login({ email: identifier.trim(), password });
      setSessionUser(response.user, response.token);
      return response.user;
    },
    [setSessionUser],
  );

  const signInWithAdminCredentials = React.useCallback(
    async (username: string, password: string) => {
      const response = await api.adminLogin({
        username: username.trim(),
        password,
      });
      setSessionUser(response.user, response.token);
      return response.user;
    },
    [setSessionUser],
  );

  const signUpWithPassword = React.useCallback(
    async (payload: SignUpPayload) => {
      const response = await api.register(payload);
      setSessionUser(response.user, response.token);
      return response.user;
    },
    [setSessionUser],
  );

  const signInWithGoogle = React.useCallback(async (redirectTo?: string) => {
    const targetPath = normalizeRedirectPath(redirectTo);
    const callbackUrl = `${window.location.origin}/login?redirect=${encodeURIComponent(targetPath)}`;

    setStoredAuthToken(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const logout = React.useCallback(async () => {
    await supabase.auth.signOut();
    setSessionUser(null, null);
  }, [setSessionUser]);

  const refreshUser = React.useCallback(async () => {
    let token = getStoredAuthToken();

    if (!token) {
      token = await getSupabaseAccessToken().catch(() => null);
      if (token) {
        setStoredAuthToken(token);
      }
    }

    if (!token) {
      setSessionUser(null, null);
      return;
    }

    try {
      const profile = await api.getMe();
      setSessionUser(profile, token);
    } catch {
      setSessionUser(null, null);
      throw new Error("Session expired. Please login again.");
    }
  }, [setSessionUser]);

  React.useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      let token = getStoredAuthToken();

      if (!token) {
        token = await getSupabaseAccessToken().catch(() => null);
        if (token) {
          setStoredAuthToken(token);
        }
      }

      if (!token) {
        if (!cancelled) {
          setUser(null);
          setIsReady(true);
        }
        return;
      }

      try {
        const profile = await api.getMe();
        if (!cancelled) {
          setUser(profile);
        }
      } catch {
        setStoredAuthToken(null);
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "ADMIN",
      signInWithPassword,
      signInWithAdminCredentials,
      signUpWithPassword,
      signInWithGoogle,
      logout,
      refreshUser,
    }),
    [
      isReady,
      logout,
      refreshUser,
      signInWithAdminCredentials,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
