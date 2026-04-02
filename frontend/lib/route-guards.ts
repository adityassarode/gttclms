"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
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

    if (!isAuthenticated) {
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

  if (!isAuthenticated) {
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

    if (!isAuthenticated) {
      router.replace(
        `/admin/login?redirect=${encodeURIComponent(redirectTarget)}`,
      );
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isAuthenticated, isReady, redirectTarget, router]);

  return isReady && isAuthenticated && isAdmin;
}

export function useRequireLoginAction() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isReady, user } = useAuth();

  return React.useCallback(
    (redirectPath?: string) => {
      const target = normalizeRedirectPath(redirectPath || pathname);

      if (!isReady) {
        return false;
      }

      if (!isAuthenticated) {
        router.push(loginPath(target));
        return false;
      }

      if (user?.role === "USER" && !user.verified) {
        router.push(verifyPath(target));
        return false;
      }

      return true;
    },
    [isAuthenticated, isReady, pathname, router, user?.role, user?.verified],
  );
}
