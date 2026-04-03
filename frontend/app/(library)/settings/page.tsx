"use client";

import * as React from "react";
import {
  Settings,
  Bell,
  Mail,
  BookOpen,
  Sparkles,
  User,
  Shield,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useProtectedPage } from "@/lib/route-guards";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PREFS_STORAGE_KEY = "gttc_notification_prefs";

type Preferences = {
  emailUpdates: boolean;
  reservationReminders: boolean;
  newArrivals: boolean;
  dueDateReminders: boolean;
};

const defaultPreferences: Preferences = {
  emailUpdates: true,
  reservationReminders: true,
  newArrivals: false,
  dueDateReminders: true,
};

function getInitials(name?: string | null) {
  if (!name) {
    return "GU";
  }
  const parts = name.trim().split(" ").filter(Boolean);
  return (parts[0]?.[0] || "G") + (parts[1]?.[0] || "U");
}

export default function SettingsPage() {
  const allowed = useProtectedPage({ redirectPath: "/settings" });
  const { user } = useAuth();

  const [prefs, setPrefs] = React.useState<Preferences>(defaultPreferences);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Preferences;
      setPrefs({ ...defaultPreferences, ...parsed });
    } catch {
      setPrefs(defaultPreferences);
    }
  }, []);

  const handlePrefsChange = (key: keyof Preferences, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
    }
    toast.success("Preference updated");
  };

  if (!allowed || !user) {
    return <div className="py-8" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
            <Settings className="h-6 w-6 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Settings
            </h1>
            <p className="text-muted-foreground">
              Manage account and notification preferences
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Synced from your account</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="/placeholder-user.svg" alt="Profile" />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Phone Number</Label>
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                    {user.phone || "Not provided"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Register Number</Label>
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                    {user.registerNumber || "Not verified"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                    {user.department || "Not set"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Semester</Label>
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                    {user.semester || "Not set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    These preferences are stored in your browser
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Email Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Weekly summary emails
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.emailUpdates}
                  onCheckedChange={(checked) =>
                    handlePrefsChange("emailUpdates", checked)
                  }
                />
              </div>

              <div className="flex flex-col gap-3 rounded-xl bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">
                      Due Date Reminders
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Notify before due date
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.dueDateReminders}
                  onCheckedChange={(checked) =>
                    handlePrefsChange("dueDateReminders", checked)
                  }
                />
              </div>

              <div className="flex flex-col gap-3 rounded-xl bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">
                      Reservation Alerts
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Warnings for expiring reservations
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.reservationReminders}
                  onCheckedChange={(checked) =>
                    handlePrefsChange("reservationReminders", checked)
                  }
                />
              </div>

              <div className="flex flex-col gap-3 rounded-xl bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">New Arrivals</p>
                    <p className="text-sm text-muted-foreground">
                      Highlights of recently added books
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.newArrivals}
                  onCheckedChange={(checked) =>
                    handlePrefsChange("newArrivals", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium text-foreground">
                  {user.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Verification
                </span>
                <span className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {user.verified ? "Verified" : "Pending"}
                </span>
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <span className="text-sm font-medium text-foreground">
                  {user.role}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
