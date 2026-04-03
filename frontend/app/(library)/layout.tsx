"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Heart,
  Clock,
  BookMarked,
  Gift,
  HelpCircle,
  Settings,
  LogOut,
  Search,
  Bell,
  Menu,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { name: "Discover", href: "/", icon: Home, requiresAuth: false },
  { name: "Favorites", href: "/favorites", icon: Heart, requiresAuth: true },
  { name: "Borrowed", href: "/borrowed", icon: BookMarked, requiresAuth: true },
  { name: "Reserved", href: "/reserved", icon: Clock, requiresAuth: true },
  { name: "Donate", href: "/donate", icon: Gift, requiresAuth: true },
  {
    name: "My Donations",
    href: "/donations",
    icon: BookOpen,
    requiresAuth: true,
  },
];

const secondaryNav = [
  { name: "Help Center", href: "/help", icon: HelpCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

function getInitials(name?: string | null) {
  if (!name) {
    return "GU";
  }
  const parts = name.trim().split(" ").filter(Boolean);
  return (parts[0]?.[0] || "G") + (parts[1]?.[0] || "U");
}

function SidebarContent({
  onNavigate,
  onNavItemClick,
  isAuthenticated,
  user,
}: {
  onNavigate?: () => void;
  onNavItemClick: (
    href: string,
    requiresAuth: boolean,
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => void;
  isAuthenticated: boolean;
  user: {
    name?: string | null;
    department?: string | null;
    year?: string | null;
  };
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-6 py-6">
        <Image
          src="/gttc-logo.png"
          alt="GTTC logo"
          width={220}
          height={220}
          className="h-auto w-full max-w-[180px]"
          priority
        />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="mb-3 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Browse
        </p>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(event) => {
                onNavigate?.();
                onNavItemClick(item.href, item.requiresAuth, event);
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
              {item.requiresAuth && !isAuthenticated ? (
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  Login
                </Badge>
              ) : null}
            </Link>
          );
        })}

        <div className="pt-6">
          <p className="mb-3 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Support
          </p>
          {secondaryNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={(event) => {
                  onNavigate?.();
                  onNavItemClick(item.href, false, event);
                }}
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
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t border-border p-4">
        {isAuthenticated ? (
          <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src="/placeholder-user.svg" alt="User" />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name || "Library User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {[user.department, user.year].filter(Boolean).join(" • ") ||
                  "Member"}
              </p>
            </div>
          </div>
        ) : (
          <Button className="w-full" asChild>
            <Link href="/login" onClick={onNavigate}>
              Login to Continue
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [globalSearch, setGlobalSearch] = React.useState("");
  const [notificationCount, setNotificationCount] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      if (!isAuthenticated) {
        setNotificationCount(0);
        return;
      }

      try {
        const [reservations, borrows] = await Promise.all([
          api.getMyReservations(),
          api.getMyBorrows(),
        ]);
        const now = Date.now();
        const dueSoonWindowMs = 3 * 24 * 60 * 60 * 1000;

        const activeReservations = reservations.filter(
          (row) => row.status === "ACTIVE",
        ).length;
        const dueSoonBorrows = borrows.filter((row) => {
          if (row.status !== "BORROWED") {
            return false;
          }
          const dueAt = new Date(row.dueAt).getTime();
          return dueAt >= now && dueAt - now <= dueSoonWindowMs;
        }).length;

        if (!cancelled) {
          setNotificationCount(activeReservations + dueSoonBorrows);
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
  }, [isAuthenticated]);

  const handleNavigationClick = React.useCallback(
    (
      href: string,
      requiresAuth: boolean,
      event: React.MouseEvent<HTMLAnchorElement>,
    ) => {
      if (!requiresAuth || isAuthenticated) {
        return;
      }

      event.preventDefault();
      setSidebarOpen(false);
      toast.error("Please login to continue");
      router.push(`/login?redirect=${encodeURIComponent(href)}`);
    },
    [isAuthenticated, router],
  );

  const handleGlobalSearch = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const query = globalSearch.trim();
      if (!query) {
        router.push("/");
        return;
      }
      router.push(`/?q=${encodeURIComponent(query)}`);
    },
    [globalSearch, router],
  );

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card lg:block">
        <SidebarContent
          isAuthenticated={isAuthenticated}
          user={user || {}}
          onNavItemClick={handleNavigationClick}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarContent
            isAuthenticated={isAuthenticated}
            user={user || {}}
            onNavItemClick={handleNavigationClick}
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

              <div className="hidden md:flex items-center gap-2">
                <form className="relative" onSubmit={handleGlobalSearch}>
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search books, authors..."
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    className="w-64 pl-9 bg-secondary/50 border-0 focus-visible:ring-1 lg:w-80"
                  />
                </form>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.error("Please login to view notifications");
                    router.push("/login?redirect=%2Freserved");
                    return;
                  }
                  router.push("/reserved");
                }}
                aria-label="Open notifications"
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
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src="/placeholder-user.svg" alt="User" />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.name || "Guest"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || "Login required for restricted actions"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/help">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Help Center
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isAuthenticated ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        logout();
                        router.push("/login");
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href="/login">
                        <LogOut className="mr-2 h-4 w-4" />
                        Login
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="border-t border-border/60 px-3 pb-3 md:hidden">
            <form className="relative" onSubmit={handleGlobalSearch}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search books, authors..."
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                className="h-10 pl-9"
              />
            </form>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/50 px-3 py-4 sm:px-4 lg:px-8">
          <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
            <p className="text-sm text-muted-foreground">
              Designed by Aditya Sarode
            </p>
            <p className="text-xs text-muted-foreground">
              GTTC Library Management System
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
