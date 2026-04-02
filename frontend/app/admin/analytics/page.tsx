"use client";

import * as React from "react";
import {
  BookOpen,
  BookMarked,
  Clock3,
  Gift,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AnalyticsResponse, DonationRecord, User } from "@/lib/types";
import { getErrorMessage, toIsoDate } from "@/lib/ui-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function StatCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: number;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-11 sm:w-11">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <Badge variant="secondary" className="text-xs">
            Live
          </Badge>
        </div>
        <p className="mt-4 text-xl font-semibold text-foreground sm:text-2xl">
          {value}
        </p>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function toDayLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", { weekday: "short" });
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = React.useState<AnalyticsResponse | null>(
    null,
  );
  const [bookCount, setBookCount] = React.useState(0);
  const [users, setUsers] = React.useState<User[]>([]);
  const [donations, setDonations] = React.useState<DonationRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadAnalytics = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [analyticsResponse, books, usersResponse, donationsResponse] =
        await Promise.all([
          api.getAdminAnalytics(),
          api.getBooks(),
          api.getAdminUsers(),
          api.getAllDonations(),
        ]);

      setAnalytics(analyticsResponse);
      setBookCount(books.length);
      setUsers(usersResponse);
      setDonations(donationsResponse);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load analytics"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const trendData = React.useMemo(() => {
    if (!analytics) {
      return [];
    }

    const reserveMap = new Map(
      analytics.reserveTrends.map((item) => [item.label, item.value]),
    );

    return analytics.borrowTrends.map((item) => ({
      day: toDayLabel(item.label),
      borrows: item.value,
      reservations: reserveMap.get(item.label) || 0,
    }));
  }, [analytics]);

  const categoryData = analytics?.categoryPopularity || [];
  const topBorrowed = analytics?.topBorrowed || [];

  const totals = React.useMemo(() => {
    const totalBorrows = (analytics?.borrowTrends || []).reduce(
      (sum, row) => sum + row.value,
      0,
    );
    const totalReservations = (analytics?.reserveTrends || []).reduce(
      (sum, row) => sum + row.value,
      0,
    );
    const activeUsers = users.filter((row) => row.status === "ACTIVE").length;
    const donations7d = donations.filter((row) => {
      const createdAt = new Date(row.createdAt).getTime();
      return createdAt >= Date.now() - 7 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      totalBorrows,
      totalReservations,
      activeUsers,
      donations7d,
    };
  }, [analytics, users, donations]);

  const recentDonations = React.useMemo(
    () =>
      [...donations]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 6),
    [donations],
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-1 text-muted-foreground">
            Detailed activity trends and usage signals from backend data.
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          onClick={loadAnalytics}
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
        <StatCard
          title="Books"
          value={bookCount}
          note="Total titles in catalog"
          icon={BookOpen}
        />
        <StatCard
          title="Users"
          value={users.length}
          note="Accounts in system"
          icon={Users}
        />
        <StatCard
          title="Active Users"
          value={totals.activeUsers}
          note="Non-banned accounts"
          icon={TrendingUp}
        />
        <StatCard
          title="Borrows (7 days)"
          value={totals.totalBorrows}
          note="Borrow trend sum"
          icon={BookMarked}
        />
        <StatCard
          title="Reservations (7 days)"
          value={totals.totalReservations}
          note="Reservation trend sum"
          icon={Clock3}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Borrowing vs Reservations</CardTitle>
            <CardDescription>Trend over the latest period</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            <div className="h-[240px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                    }}
                  />
                  <Legend />
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
                    stroke="hsl(var(--chart-2))"
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
            <CardDescription>Borrow counts by category</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            <div className="h-[240px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ left: 0, right: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis type="number" className="text-xs" />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={80}
                    className="text-xs"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Top Borrowed Books</CardTitle>
            <CardDescription>Demand leaders from analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topBorrowed.length > 0 ? (
                topBorrowed.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 p-3"
                  >
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {row.label}
                    </p>
                    <Badge variant="secondary">{row.value}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No top borrowed data available yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Recent Donations
            </CardTitle>
            <CardDescription>
              {totals.donations7d} submitted in the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDonations.length > 0 ? (
                recentDonations.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border/50 p-3"
                  >
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {row.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.donorName || "Anonymous"} •{" "}
                      {toIsoDate(row.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent donations.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Refreshing analytics...</p>
      ) : null}
    </div>
  );
}
