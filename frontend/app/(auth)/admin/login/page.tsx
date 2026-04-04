"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
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

export default function AdminLoginPage() {
  const { signInWithAdminCredentials, logout, user, isReady } = useAuth();

  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [form, setForm] = React.useState({ username: "", password: "" });

  React.useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    if (user.role === "ADMIN") {
      window.location.href = "/admin";
      return;
    }

    window.location.href = "/";
  }, [isReady, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.username || !form.password) {
      toast.error("Admin email and password are required");
      return;
    }

    if (!form.username.includes("@")) {
      toast.error("Use your admin email address");
      return;
    }

    setIsLoading(true);
    try {
      const identifier = form.username.trim();
      const profile = await signInWithAdminCredentials(
        identifier,
        form.password,
      );

      if (!profile) {
        toast.error(
          "Authenticated, but backend profile is not ready yet. Wait 30-60 seconds and try again.",
        );
        return;
      }

      if (profile.role !== "ADMIN") {
        await logout();
        toast.error("This account does not have admin access");
        return;
      }
      toast.success("Admin login successful");
      window.location.href = "/admin";
    } catch (error) {
      toast.error(getErrorMessage(error, "Invalid admin credentials"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md overflow-hidden border-border/50 shadow-xl shadow-primary/5">
      <CardHeader className="px-4 pt-5 text-center sm:px-6 sm:pt-6">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <ShieldCheck className="h-7 w-7 text-primary-foreground" />
        </div>
        <CardTitle className="text-xl font-bold sm:text-2xl">
          Admin Login
        </CardTitle>
        <CardDescription>
          Access the library management dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-5 sm:px-6 sm:pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Admin Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                type="email"
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
                placeholder="admin@gttc.edu"
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
                placeholder="Enter password"
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
            Sign In to Dashboard
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
