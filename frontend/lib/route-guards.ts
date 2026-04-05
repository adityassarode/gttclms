"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isAdminRole, isUserRole } from "@/lib/role-utils";

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
  const { isReady, user } = useAuth();

  const redirectTarget = normalizeRedirectPath(opts?.redirectPath || pathname);
  const needsVerification = user && isUserRole(user.role) && !user.verified;

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace(loginPath(redirectTarget));
      return;
    }

    if (needsVerification && pathname !== "/verify") {
      router.replace(verifyPath(redirectTarget));
    }
  }, [isReady, needsVerification, pathname, redirectTarget, router, user]);

  if (!isReady) {
    return false;
  }

  if (!user) {
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
  const { isReady, user } = useAuth();
  const redirectTarget = normalizeRedirectPath(pathname);
  const isAdmin = isAdminRole(user?.role);

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace(
        `/admin/login?redirect=${encodeURIComponent(redirectTarget)}`,
      );
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isReady, redirectTarget, router, user]);

  if (!isReady) {
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
  const { user } = useAuth();
  const needsVerification = user && isUserRole(user.role) && !user.verified;

  return React.useCallback(
    (redirectPath?: string) => {
      const target = normalizeRedirectPath(redirectPath || pathname);

      if (!user) {
        router.push(loginPath(target));
        return false;
      }

      if (needsVerification) {
        router.push(verifyPath(target));
        return false;
      }

      return true;
    },
    [needsVerification, pathname, router, user],
  );
}
