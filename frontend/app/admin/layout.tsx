"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  BarChart3,
  Gift,
  Settings,
  LogOut,
  Menu,
  Bell,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useProtectedAdminPage } from "@/lib/route-guards";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Students", href: "/admin/students", icon: GraduationCap },
  { name: "Books", href: "/admin/books", icon: BookOpen },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Donations", href: "/admin/donations", icon: Gift },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

function getInitials(name?: string | null) {
  if (!name) {
    return "AD";
  }
  const parts = name.trim().split(" ").filter(Boolean);
  return (parts[0]?.[0] || "A") + (parts[1]?.[0] || "D");
}

function SidebarContent({
  onNavigate,
  user,
}: {
  onNavigate?: () => void;
  user?: {
    name?: string | null;
    role?: string | null;
  };
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <Image
          src="/gttc-logo.png"
          alt="GTTC logo"
          width={220}
          height={220}
          className="h-auto w-full max-w-[180px]"
          priority
        />
        <p className="mt-2 text-xs text-muted-foreground">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="mb-3 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Management
        </p>
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Admin Info */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src="/placeholder-user.svg" alt="Admin" />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name || "Administrator"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.role === "ADMIN" ? "Administrator" : user?.role || "Admin"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = useProtectedAdminPage();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [notificationCount, setNotificationCount] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const rows = await api.getAllDonations();
        const now = Date.now();
        const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
        const recentCount = rows.filter(
          (row) => now - new Date(row.createdAt).getTime() <= twoDaysMs,
        ).length;

        if (!cancelled) {
          setNotificationCount(recentCount);
        }
      } catch {
        if (!cancelled) {
          setNotificationCount(0);
        }
      }
    };

    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentSection = React.useMemo(() => {
    const found = navigation.find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/admin" && pathname.startsWith(item.href)),
    );
    return found?.name || "Dashboard";
  }, [pathname]);

  if (!allowed) {
    return <div className="py-8" />;
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card lg:block">
        <SidebarContent user={user || undefined} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
          <SidebarContent
            user={user || undefined}
            onNavigate={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-3 sm:gap-4 sm:px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
              </Sheet>

              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                {currentSection}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => router.push("/admin/donations")}
                aria-label="Open donation notifications"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 ? (
                  <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </Badge>
                ) : null}
                <span className="sr-only">Notifications</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.svg" alt="Admin" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block">
                      {user?.name || "Admin"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.name || "Administrator"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || "admin@gttc.local"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      logout();
                      router.push("/admin/login");
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
