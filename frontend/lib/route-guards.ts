"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStoredAuthToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function normalizeRedirectPath(path?: string | null) {
  if (!path) {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function loginPath(redirectPath: string) {
  return `/login?redirect=${encodeURIComponent(redirectPath)}`;
}

function verifyPath(redirectPath: string) {
  return `/verify?redirect=${encodeURIComponent(redirectPath)}`;
}

export function useProtectedPage(opts?: { redirectPath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isReady, user } = useAuth();

  const redirectTarget = normalizeRedirectPath(opts?.redirectPath || pathname);
  const needsVerification = user?.role === "USER" && !user.verified;

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    const hasToken = Boolean(getStoredAuthToken());

    if (!hasToken && !isAuthenticated) {
      router.replace(loginPath(redirectTarget));
      return;
    }

    if (needsVerification && pathname !== "/verify") {
      router.replace(verifyPath(redirectTarget));
    }
  }, [
    isAuthenticated,
    isReady,
    needsVerification,
    pathname,
    redirectTarget,
    router,
  ]);

  if (!isReady) {
    return false;
  }

  const hasToken = Boolean(getStoredAuthToken());

  if (!hasToken && !isAuthenticated) {
    return false;
  }

  if (needsVerification && pathname !== "/verify") {
    return false;
  }

  return true;
}

export function useProtectedAdminPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isReady, user } = useAuth();
  const redirectTarget = normalizeRedirectPath(pathname);
  const isAdmin = user?.role === "ADMIN";

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    const hasToken = Boolean(getStoredAuthToken());

    if (!hasToken && !isAuthenticated) {
      router.replace(
        `/admin/login?redirect=${encodeURIComponent(redirectTarget)}`,
      );
      return;
    }

    if (!user) {
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isAuthenticated, isReady, redirectTarget, router, user]);

  if (!isReady) {
    return false;
  }

  const hasToken = Boolean(getStoredAuthToken());
  if (!hasToken && !isAuthenticated) {
    return false;
  }

  if (!user) {
    return false;
  }

  return isAdmin;
}

export function useRequireLoginAction() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isReady, user } = useAuth();
  const needsVerification = user?.role === "USER" && !user.verified;

  return React.useCallback(
    (redirectPath?: string) => {
      const target = normalizeRedirectPath(redirectPath || pathname);

      if (!isReady) {
        return false;
      }

      const hasToken = Boolean(getStoredAuthToken());

      if (!hasToken && !isAuthenticated) {
        router.push(loginPath(target));
        return false;
      }

      if (needsVerification) {
        router.push(verifyPath(target));
        return false;
      }

      return true;
    },
    [isAuthenticated, isReady, needsVerification, pathname, router],
  );
}
