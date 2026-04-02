"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, getStoredAuthToken, setStoredAuthToken } from "@/lib/api";
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

type GooglePromptMomentNotification = {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  isDismissedMoment?: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
  getDismissedReason?: () => string;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          prompt: (
            listener?: (notification: GooglePromptMomentNotification) => void,
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let googleScriptPromise: Promise<void> | null = null;

function normalizeRedirectPath(path?: string) {
  if (!path) {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function getPostAuthPath(user: User, redirectTo?: string) {
  if (redirectTo) {
    return normalizeRedirectPath(redirectTo);
  }
  if (user.role === "ADMIN") {
    return "/admin";
  }
  if (user.role === "USER" && !user.verified) {
    return "/verify";
  }
  return "/";
}

function loadGoogleScript() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google login is only available in browser"),
    );
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_SCRIPT_SRC}"]`,
      );

      if (existing) {
        if (
          window.google?.accounts?.id ||
          existing.getAttribute("data-loaded") === "true"
        ) {
          resolve();
          return;
        }

        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Unable to load Google sign-in script")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        script.setAttribute("data-loaded", "true");
        resolve();
      };
      script.onerror = () =>
        reject(new Error("Unable to load Google sign-in script"));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

async function requestGoogleIdToken() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Google login is not configured");
  }

  await loadGoogleScript();

  const identity = window.google?.accounts?.id;
  if (!identity) {
    throw new Error("Google login is not available in this browser");
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const complete = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      callback();
    };

    const timeout = window.setTimeout(() => {
      complete(() => reject(new Error("Google login timed out")));
    }, 45000);

    identity.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        complete(() => {
          window.clearTimeout(timeout);
          if (!credential) {
            reject(new Error("Google login was cancelled"));
            return;
          }
          resolve(credential);
        });
      },
    });

    identity.prompt((notification) => {
      const blocked =
        notification.isNotDisplayed?.() || notification.isSkippedMoment?.();
      const dismissed = notification.isDismissedMoment?.();

      if (blocked || dismissed) {
        complete(() => {
          window.clearTimeout(timeout);
          const reason =
            notification.getNotDisplayedReason?.() ||
            notification.getSkippedReason?.() ||
            notification.getDismissedReason?.() ||
            "Google login was dismissed";
          reject(new Error(reason));
        });
      }
    });
  });
}

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  const setSessionUser = React.useCallback(
    (profile: User | null, token?: string) => {
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

  const signInWithGoogle = React.useCallback(
    async (redirectTo?: string) => {
      const idToken = await requestGoogleIdToken();
      const response = await api.googleLogin(idToken);
      setSessionUser(response.user, response.token);
      router.push(getPostAuthPath(response.user, redirectTo));
    },
    [router, setSessionUser],
  );

  const logout = React.useCallback(async () => {
    setSessionUser(null, null);
  }, [setSessionUser]);

  const refreshUser = React.useCallback(async () => {
    if (!getStoredAuthToken()) {
      setSessionUser(null);
      return;
    }

    try {
      const profile = await api.getMe();
      setSessionUser(profile);
    } catch {
      setSessionUser(null, null);
      throw new Error("Session expired. Please login again.");
    }
  }, [setSessionUser]);

  React.useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const token = getStoredAuthToken();

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
