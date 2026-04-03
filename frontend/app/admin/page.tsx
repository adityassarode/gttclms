"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  ArrowUpRight,
  BookMarked,
  Gift,
  ChevronRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  LineChart,
} from "recharts";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AnalyticsResponse, DonationRecord } from "@/lib/types";
import { getErrorMessage, toIsoDate } from "@/lib/ui-helpers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function StatCard({
  title,
  value,
  icon: Icon,
  note,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  note: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
          <Badge variant="secondary" className="font-medium text-emerald-600">
            <ArrowUpRight className="mr-1 h-3 w-3" />
            Live
          </Badge>
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-foreground sm:text-3xl">
            {value}
          </p>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function toChartLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = React.useState<AnalyticsResponse | null>(
    null,
  );
  const [bookCount, setBookCount] = React.useState(0);
  const [userCount, setUserCount] = React.useState(0);
  const [donations, setDonations] = React.useState<DonationRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [analyticsResponse, books, users, donationsResponse] =
          await Promise.all([
            api.getAdminAnalytics(),
            api.getBooks(),
            api.getAdminUsers(),
            api.getAllDonations(),
          ]);

        if (!cancelled) {
          setAnalytics(analyticsResponse);
          setBookCount(books.length);
          setUserCount(users.length);
          setDonations(donationsResponse);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Unable to load admin dashboard"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const borrowTrendData = React.useMemo(() => {
    if (!analytics) {
      return [];
    }

    const reserveByLabel = new Map(
      analytics.reserveTrends.map((item) => [item.label, item.value]),
    );
    return analytics.borrowTrends.map((item) => ({
      label: toChartLabel(item.label),
      borrows: item.value,
      reservations: reserveByLabel.get(item.label) || 0,
    }));
  }, [analytics]);

  const topBorrowed = analytics?.topBorrowed || [];
  const categories = analytics?.categoryPopularity || [];
  const donations7d = React.useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return donations.filter(
      (donation) => new Date(donation.createdAt).getTime() >= sevenDaysAgo,
    ).length;
  }, [donations]);

  const recentDonations = React.useMemo(
    () =>
      [...donations]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5),
    [donations],
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground">
          Live metrics from the GTTC library backend
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          title="Total Users"
          value={String(userCount)}
          icon={Users}
          note="Registered accounts"
        />
        <StatCard
          title="Books in Collection"
          value={String(bookCount)}
          icon={BookOpen}
          note="Catalog titles"
        />
        <StatCard
          title="Borrows (7 days)"
          value={String(
            (analytics?.borrowTrends || []).reduce(
              (sum, point) => sum + point.value,
              0,
            ),
          )}
          icon={BookMarked}
          note="Completed and active borrows"
        />
        <StatCard
          title="Donations (7 days)"
          value={String(donations7d)}
          icon={Gift}
          note="Community contributions"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Weekly Borrowing vs Reservations</CardTitle>
            <CardDescription>
              Activity trend over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            <div className="h-[240px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={borrowTrendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="borrows"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="reservations"
                    stroke="hsl(var(--accent))"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Category Popularity</CardTitle>
            <CardDescription>Most borrowed categories</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            <div className="h-[240px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis type="number" className="text-xs" />
                  <YAxis
                    dataKey="label"
                    type="category"
                    className="text-xs"
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Top Borrowed Books</CardTitle>
              <CardDescription>Most in-demand titles</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="self-start sm:self-auto"
              asChild
            >
              <Link href="/admin/books">
                Manage books
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topBorrowed.length > 0 ? (
                topBorrowed.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 p-3"
                  >
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <Badge variant="secondary">{item.value}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No analytics available yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recent Donations</CardTitle>
              <CardDescription>Latest submissions by users</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="self-start sm:self-auto"
              asChild
            >
              <Link href="/admin/donations">
                Review donations
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDonations.length > 0 ? (
                recentDonations.map((donation) => (
                  <div
                    key={donation.id}
                    className="rounded-xl border border-border/50 p-3"
                  >
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {donation.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {donation.donorName || "Anonymous"} •{" "}
                      {toIsoDate(donation.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No donations submitted yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Refreshing dashboard...</p>
      ) : null}
    </div>
  );
}
