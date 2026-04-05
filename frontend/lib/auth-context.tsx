"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { isAdminRole } from "@/lib/role-utils";
import { supabase } from "@/lib/supabase";
import type { RegisterPayload, User } from "@/lib/types";

type SignUpPayload = RegisterPayload;

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isReady: boolean;
  setProfile: (profile: User | null) => void;
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
  setProfile: () => {},
  signInWithPassword: noopUser,
  signInWithAdminCredentials: noopUser,
  signUpWithPassword: noopUser,
  signInWithGoogle: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
};

const AuthContext = React.createContext<AuthContextValue>(defaultValue);
const OAUTH_REDIRECT_KEY = "gttc_lms_oauth_redirect";
const LEGACY_TOKEN_KEYS = ["gttc_lms_auth_token", "token"];

type SupabaseIdentity = {
  identity_data?: Record<string, unknown> | null;
};

type SupabaseSessionUser = {
  id?: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: SupabaseIdentity[] | null;
};

function asNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeAvatarUrl(url?: string | null) {
  return asNonEmptyString(url) ?? null;
}

function extractAvatarUrl(authUser: SupabaseSessionUser | null) {
  if (!authUser) {
    return null;
  }

  const metadata = authUser.user_metadata || {};
  const fromMetadata =
    asNonEmptyString(metadata["avatar_url"]) ||
    asNonEmptyString(metadata["picture"]) ||
    asNonEmptyString(metadata["photo_url"]) ||
    asNonEmptyString(metadata["photoURL"]);

  if (fromMetadata) {
    return fromMetadata;
  }

  if (!Array.isArray(authUser.identities)) {
    return null;
  }

  for (const identity of authUser.identities) {
    const identityData = identity?.identity_data;
    if (!identityData) {
      continue;
    }

    const fromIdentity =
      asNonEmptyString(identityData["avatar_url"]) ||
      asNonEmptyString(identityData["picture"]) ||
      asNonEmptyString(identityData["photo_url"]) ||
      asNonEmptyString(identityData["photoURL"]);

    if (fromIdentity) {
      return fromIdentity;
    }
  }

  return null;
}

function withAvatar(
  profile: User | null,
  authUser: SupabaseSessionUser | null,
  previousAvatarUrl?: string | null,
) {
  if (!profile) {
    return null;
  }

  const avatarUrl =
    normalizeAvatarUrl(profile.avatarUrl) ||
    extractAvatarUrl(authUser) ||
    normalizeAvatarUrl(previousAvatarUrl);

  return {
    ...profile,
    avatarUrl: avatarUrl || null,
  };
}

function clearLegacyTokenKeys() {
  try {
    if (typeof window !== "undefined") {
      LEGACY_TOKEN_KEYS.forEach((key) => window.localStorage.removeItem(key));
    }
  } catch {
    // ignore local storage failures
  }
}

function clearClientSessionData() {
  if (typeof window === "undefined") {
    return;
  }

  clearLegacyTokenKeys();

  try {
    window.sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
  } catch {
    // ignore session storage failures
  }
}

function normalizeRedirectPath(path?: string) {
  if (!path) {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function buildFallbackUserProfile(
  authUser: SupabaseSessionUser | null,
): User | null {
  if (!authUser?.id || !authUser.email) {
    return null;
  }

  const metadata = authUser.user_metadata || {};
  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : authUser.email.split("@")[0];

  return {
    id: authUser.id,
    email: authUser.email,
    name: fullName,
    avatarUrl: extractAvatarUrl(authUser),
    phone: null,
    registerNumber: null,
    department: null,
    semester: null,
    year: null,
    role: "USER",
    status: "ACTIVE",
    verified: false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  const setSessionUser = React.useCallback((profile: User | null) => {
    setUser((previous) => {
      if (!profile) {
        return null;
      }

      const preservedAvatarUrl =
        normalizeAvatarUrl(profile.avatarUrl) ||
        normalizeAvatarUrl(previous?.avatarUrl);

      return {
        ...profile,
        avatarUrl: preservedAvatarUrl || null,
      };
    });
  }, []);

  const signInWithPassword = React.useCallback(
    async (identifier: string, password: string) => {
      const email = identifier.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      const accessToken = data.session?.access_token ?? null;
      const sessionUser = (data.user as SupabaseSessionUser | null) ?? null;
      try {
        const profile = withAvatar(await api.getMe(accessToken), sessionUser);
        setSessionUser(profile);
        return profile;
      } catch {
        const fallbackProfile = buildFallbackUserProfile(sessionUser);
        if (fallbackProfile) {
          setSessionUser(fallbackProfile);
          return fallbackProfile;
        }
        throw new Error("Authenticated, but profile sync is not ready yet");
      }
    },
    [setSessionUser],
  );

  const signInWithAdminCredentials = React.useCallback(
    async (username: string, password: string) => {
      const email = username.trim().toLowerCase();

      if (!email.includes("@")) {
        throw new Error("Use admin email address");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      const accessToken = data.session?.access_token ?? null;
      const sessionUser = (data.user as SupabaseSessionUser | null) ?? null;
      const profile = withAvatar(await api.getMe(accessToken), sessionUser);
      if (!isAdminRole(profile.role)) {
        try {
          await supabase.auth.signOut({ scope: "global" });
        } catch {
          // ignore sign-out failures
        }
        setSessionUser(null);
        throw new Error("This account does not have admin access");
      }

      setSessionUser(profile);
      return profile;
    },
    [setSessionUser],
  );

  const signUpWithPassword = React.useCallback(
    async (payload: SignUpPayload) => {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        options: {
          data: {
            full_name: payload.name,
            phone: payload.phone ?? undefined,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session) {
        setSessionUser(null);
        return null;
      }

      try {
        const accessToken = data.session.access_token;
        const profile = withAvatar(
          await api.getMe(accessToken),
          (data.user as SupabaseSessionUser | null) ?? null,
        );
        setSessionUser(profile);
        return profile;
      } catch {
        const fallbackProfile = buildFallbackUserProfile(data.user);
        if (fallbackProfile) {
          setSessionUser(fallbackProfile);
          return fallbackProfile;
        }
        setSessionUser(null);
        return null;
      }
    },
    [setSessionUser],
  );

  const signInWithGoogle = React.useCallback(async (redirectTo?: string) => {
    const targetPath = normalizeRedirectPath(redirectTo);
    const callbackUrl = `${window.location.origin}/login`;

    // Ensure OAuth always starts from a signed-out state.
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // ignore sign-out failures and continue with OAuth flow
    }
    clearClientSessionData();

    try {
      window.sessionStorage.setItem(OAUTH_REDIRECT_KEY, targetPath);
    } catch {
      // ignore session storage failures
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          prompt: "select_account consent",
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // ignore sign-out failures and clear local session regardless
    }
    clearClientSessionData();
    setSessionUser(null);

    if (typeof window !== "undefined") {
      clearClientSessionData();
      window.location.href = "/login";
    }
  }, [setSessionUser]);

  const refreshUser = React.useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const profile = withAvatar(
        await api.getMe(),
        (authData.user as SupabaseSessionUser | null) ?? null,
      );
      setSessionUser(profile);
    } catch {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error) {
          const fallbackProfile = buildFallbackUserProfile(
            data.user as SupabaseSessionUser,
          );
          if (fallbackProfile) {
            setSessionUser(fallbackProfile);
            throw new Error("Profile sync is pending. Please try again.");
          }
        }
      } catch {
        // ignore and fall back to session-expired handling below
      }

      setSessionUser(null);
      throw new Error("Session expired. Please login again.");
    }
  }, [setSessionUser]);

  React.useEffect(() => {
    let cancelled = false;
    clearLegacyTokenKeys();

    const readyFallback = window.setTimeout(() => {
      // Avoid marking auth as ready too early when a valid session exists
      // but profile hydration is still in-flight.
      void (async () => {
        if (cancelled) {
          return;
        }

        try {
          const { data, error } = await supabase.auth.getSession();
          if (cancelled) {
            return;
          }

          if (!error && data.session?.access_token) {
            return;
          }
        } catch {
          // fall through to ready state on session check failures
        }

        if (!cancelled) {
          setIsReady(true);
        }
      })();
    }, 1000);

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) {
          return;
        }

        if (event === "INITIAL_SESSION") {
          return;
        }

        if (session?.access_token) {
          if (event !== "TOKEN_REFRESHED" && event !== "USER_UPDATED") {
            return;
          }

          try {
            const profile = withAvatar(
              await api.getMe(session.access_token),
              (session.user as SupabaseSessionUser | null) ?? null,
            );
            if (!cancelled) {
              setSessionUser(profile);
            }
          } catch {
            // Keep the current user state on transient profile fetch errors.
            // A failed refresh should not force an auth loop back to /login.
            return;
          }
        } else if (!cancelled && event === "SIGNED_OUT") {
          setSessionUser(null);
        }
      },
    );

    const hydrate = async () => {
      let accessToken: string | null = null;
      let sessionUser: SupabaseSessionUser | null = null;

      try {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token ?? null;
        sessionUser = (data.session?.user as SupabaseSessionUser) ?? null;
      } catch {
        accessToken = null;
        sessionUser = null;
      }

      try {
        if (!accessToken) {
          if (!cancelled) {
            setSessionUser(null);
          }
          return;
        }

        const profile = withAvatar(await api.getMe(accessToken), sessionUser);
        if (!cancelled) {
          setSessionUser(profile);
        }
      } catch {
        const fallbackProfile = buildFallbackUserProfile(sessionUser);
        if (!cancelled) {
          setSessionUser(fallbackProfile);
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
      window.clearTimeout(readyFallback);
      listener?.subscription.unsubscribe();
    };
  }, [setSessionUser]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      isAuthenticated: Boolean(user),
      isAdmin: isAdminRole(user?.role),
      setProfile: setSessionUser,
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
      setSessionUser,
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
