"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { isAdminRole, isUserRole } from "@/lib/role-utils";
import { getErrorMessage } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const OAUTH_REDIRECT_KEY = "gttc_lms_oauth_redirect";

function normalizeRedirectPath(path?: string | null) {
  if (!path) {
    return "/";
  }

  if (!path.startsWith("/")) {
    return "/";
  }

  if (path.startsWith("/login") || path.startsWith("/admin/login")) {
    return "/";
  }

  return path;
}

function faceVerifyPath(redirectPath: string) {
  return `/face-verify?redirect=${encodeURIComponent(redirectPath)}`;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    user,
    isReady,
  } = useAuth();

  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const [form, setForm] = React.useState({
    email: "",
    password: "",
    name: "",
    phone: "",
  });

  const resolveRedirectTarget = React.useCallback(() => {
    const fromQuery = normalizeRedirectPath(searchParams.get("redirect"));
    if (fromQuery !== "/") {
      return fromQuery;
    }

    try {
      return normalizeRedirectPath(
        window.sessionStorage.getItem(OAUTH_REDIRECT_KEY),
      );
    } catch {
      return "/";
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    if (isAdminRole(user.role)) {
      router.replace("/admin");
      return;
    }

    const redirectTo = resolveRedirectTarget();

    try {
      window.sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
    } catch {
      // ignore session storage failures
    }

    if (isUserRole(user.role) && !user.verified) {
      router.replace(`/verify?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    if (isUserRole(user.role) && user.verified && !user.faceVerified) {
      router.replace(faceVerifyPath(redirectTo));
      return;
    }

    router.replace(redirectTo);
  }, [isReady, resolveRedirectTarget, router, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.email || !form.password) {
      toast.error(
        mode === "login"
          ? "Email and password are required"
          : "Email and password are required",
      );
      return;
    }

    if (mode === "register" && !form.name) {
      toast.error("Please enter your full name");
      return;
    }

    setIsLoading(true);
    try {
      const redirectTo = resolveRedirectTarget();
      const identifier = form.email.trim();

      if (mode === "login" && !identifier.includes("@")) {
        toast.error("Use your email address to sign in");
        return;
      }

      const profile =
        mode === "login"
          ? await signInWithPassword(identifier, form.password)
          : await signUpWithPassword({
              email: identifier,
              password: form.password,
              name: form.name,
              phone: form.phone || undefined,
            });

      if (!profile) {
        if (mode === "register") {
          toast.success("Please check your email to complete sign-up.");
        } else {
          toast.error(
            "Authenticated, but backend profile is not ready yet. Wait 30-60 seconds and try again.",
          );
        }
        return;
      }

      if (isUserRole(profile.role) && !profile.verified) {
        toast.success(
          "Account created. Verify your student ID to unlock restricted actions.",
        );
        router.replace(`/verify?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }

      if (
        isUserRole(profile.role) &&
        profile.verified &&
        !profile.faceVerified
      ) {
        toast.success(
          "Student verified. Complete face verification to continue.",
        );
        router.replace(faceVerifyPath(redirectTo));
        return;
      }

      if (isAdminRole(profile.role)) {
        toast.success("Admin login successful");
        router.replace("/admin");
        return;
      }

      toast.success("Welcome back");
      router.replace(redirectTo);
    } catch (error) {
      toast.error(getErrorMessage(error, "Authentication failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle(resolveRedirectTarget());
    } catch (error) {
      toast.error(getErrorMessage(error, "Google login failed"));
      setIsLoading(false);
      return;
    } finally {
      // OAuth redirect replaces the page, so loading state reset is only
      // needed on failure paths.
    }
  };
  return (
    <Card className="w-full max-w-md overflow-hidden border-border/50 shadow-xl shadow-primary/5">
      <CardHeader className="px-4 pb-2 pt-5 text-center sm:px-6 sm:pt-6">
        <CardTitle className="text-xl font-bold sm:text-2xl">
          {mode === "login" ? "Welcome back" : "Create an account"}
        </CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Sign in to access the library system"
            : "Register to start borrowing books"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-4 pb-5 sm:space-y-6 sm:px-6 sm:pb-6">
        <Button
          variant="outline"
          className="h-11 w-full rounded-xl font-medium"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="Enter your full name"
                    className="h-11 rounded-xl pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    placeholder="+91 98765 43210"
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder="Aditya Sarode"
                className="h-11 rounded-xl pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                placeholder="Enter your password"
                className="h-11 rounded-xl pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-xl font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {mode === "login" ? "Sign In" : "Create Account"}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          {mode === "login"
            ? "New to GTTC Library?"
            : "Already have an account?"}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="ml-1 font-medium text-primary hover:underline"
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <Card className="w-full max-w-md overflow-hidden border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="px-4 pb-2 pt-5 text-center sm:px-6 sm:pt-6">
            <CardTitle className="text-xl font-bold sm:text-2xl">
              Loading...
            </CardTitle>
            <CardDescription>Preparing sign-in form</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <LoginPageContent />
    </React.Suspense>
  );
}
