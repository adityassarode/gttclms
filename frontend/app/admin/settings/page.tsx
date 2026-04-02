"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserCog, KeyRound, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatValue(value?: string | null) {
  return value && value.trim() ? value : "Not available";
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Admin Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review account information and access administrator tools.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Account Profile
            </CardTitle>
            <CardDescription>
              Identity details from your authenticated session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Name
              </p>
              <p className="text-sm font-medium text-foreground">
                {formatValue(user?.name)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Email
              </p>
              <p className="text-sm font-medium text-foreground">
                {formatValue(user?.email)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Role
              </p>
              <Badge variant="default" className="w-fit">
                {user?.role || "ADMIN"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Security Actions
            </CardTitle>
            <CardDescription>
              Fast access to common administrative actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push("/admin")}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push("/settings")}
            >
              <UserCog className="mr-2 h-4 w-4" />
              Open User Settings
            </Button>

            <Button
              className="w-full justify-start"
              variant="destructive"
              onClick={() => {
                logout();
                router.push("/admin/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out of Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
