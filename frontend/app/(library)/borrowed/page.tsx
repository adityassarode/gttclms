"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookMarked,
  Clock,
  RotateCcw,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useProtectedPage } from "@/lib/route-guards";
import type { ApiId, BorrowRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getErrorMessage, toCoverUrl } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatTimeRemaining(dueDate: string) {
  const diff = new Date(dueDate).getTime() - Date.now();

  if (diff <= 0) {
    const overdueDays = Math.max(
      1,
      Math.abs(Math.floor(diff / (1000 * 60 * 60 * 24))),
    );
    return {
      text: `${overdueDays} day${overdueDays !== 1 ? "s" : ""} overdue`,
      isOverdue: true,
      isUrgent: true,
      progress: 100,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const totalTime = 7 * 24 * 60 * 60 * 1000;
  const elapsed = totalTime - diff;
  const progress = Math.max(0, Math.min(100, (elapsed / totalTime) * 100));

  return {
    text: days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`,
    isOverdue: false,
    isUrgent: days <= 1,
    progress,
  };
}

function BorrowedCard({
  borrow,
  onReturn,
}: {
  borrow: BorrowRecord;
  onReturn: (id: ApiId) => void;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const [isReturning, setIsReturning] = React.useState(false);
  const timeInfo = formatTimeRemaining(borrow.dueAt);

  const handleReturn = async () => {
    setIsReturning(true);
    try {
      await api.returnBorrow(borrow.id);
      onReturn(borrow.id);
      toast.success("Book returned successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to return this book"));
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/50 bg-card",
        timeInfo.isOverdue && "border-destructive/50 bg-destructive/5",
      )}
    >
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          <Link
            href={`/book/${borrow.book.id}`}
            className="relative mx-auto h-40 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-muted sm:mx-0 sm:h-32 sm:w-20"
          >
            {!loaded && <Skeleton className="absolute inset-0" />}
            <Image
              src={toCoverUrl(borrow.book.coverUrl)}
              alt={borrow.book.title}
              fill
              className={cn(
                "object-cover transition-opacity duration-300",
                loaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setLoaded(true)}
              sizes="80px"
            />
          </Link>

          <div className="flex flex-1 flex-col justify-between py-1">
            <div>
              <Badge
                variant={
                  timeInfo.isOverdue
                    ? "destructive"
                    : timeInfo.isUrgent
                      ? "secondary"
                      : "outline"
                }
                className="mb-2 text-[10px]"
              >
                {timeInfo.text}
              </Badge>
              <Link href={`/book/${borrow.book.id}`}>
                <h3 className="line-clamp-1 font-semibold text-foreground hover:text-primary">
                  {borrow.book.title}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground">
                {borrow.book.author}
              </p>
              <div className="mt-3 space-y-1">
                <Progress
                  value={timeInfo.progress}
                  className={cn(
                    "h-1.5",
                    timeInfo.isOverdue && "[&>div]:bg-destructive",
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Borrowed{" "}
                  {new Date(borrow.borrowedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
              {borrow.fee > 0 ? (
                <span className="text-sm font-medium text-destructive">
                  Late fee: Rs {borrow.fee}
                </span>
              ) : (
                <span />
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={timeInfo.isOverdue ? "destructive" : "default"}
                    size="sm"
                    className="h-8 rounded-lg"
                    disabled={isReturning}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    {isReturning ? "Returning..." : "Return"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Return this book?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {borrow.fee > 0
                        ? `You have a late fee of Rs ${borrow.fee} recorded on this borrow.`
                        : `Confirm return for ${borrow.book.title}.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReturn}>
                      Confirm Return
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BorrowedPage() {
  const allowed = useProtectedPage({ redirectPath: "/borrowed" });

  const [borrows, setBorrows] = React.useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!allowed) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await api.getMyBorrows();
        if (!cancelled) {
          setBorrows(rows);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Unable to load borrowed books"));
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
  }, [allowed]);

  const activeBorrows = borrows.filter(
    (borrow) => borrow.status === "BORROWED",
  );
  const overdueBorrows = activeBorrows.filter(
    (borrow) => new Date(borrow.dueAt).getTime() < Date.now(),
  );

  if (!allowed) {
    return <div className="py-8" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <BookMarked className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Borrowed Books
            </h1>
            <p className="text-muted-foreground">
              Track returns and avoid late fees
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {overdueBorrows.length > 0 && (
            <Badge variant="destructive">{overdueBorrows.length} overdue</Badge>
          )}
          <Badge variant="secondary">{activeBorrows.length} borrowed</Badge>
        </div>
      </div>

      {activeBorrows.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4 text-sm">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <p className="text-muted-foreground">
            Return books within{" "}
            <span className="font-medium text-foreground">7 days</span> to avoid
            Rs 10/day late fee.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border-border/50 bg-card">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
                <Skeleton className="h-32 w-20 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activeBorrows.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeBorrows.map((borrow) => (
            <BorrowedCard
              key={borrow.id}
              borrow={borrow}
              onReturn={(id) =>
                setBorrows((current) =>
                  current.filter((item) => item.id !== id),
                )
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            No borrowed books
          </h2>
          <p className="mt-1 max-w-sm text-muted-foreground">
            You have no active borrows right now.
          </p>
          <Button className="mt-6 rounded-xl" asChild>
            <Link href="/">
              Browse Books
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
