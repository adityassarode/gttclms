"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useProtectedPage } from "@/lib/route-guards";
import type { ApiId, ReservationRecord } from "@/lib/types";
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

function formatCountdown(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();

  if (diff <= 0) {
    return { text: "Expired", isExpired: true, isUrgent: true, progress: 100 };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const totalTime = 2 * 60 * 60 * 1000;
  const elapsed = totalTime - diff;
  const progress = Math.max(0, Math.min(100, (elapsed / totalTime) * 100));

  return {
    text: hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`,
    isExpired: false,
    isUrgent: diff < 30 * 60 * 1000,
    progress,
  };
}

function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: ReservationRecord;
  onCancel: (id: ApiId) => void;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const [countdown, setCountdown] = React.useState(
    formatCountdown(reservation.expiresAt),
  );
  const [isCancelling, setIsCancelling] = React.useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(formatCountdown(reservation.expiresAt));
    }, 60000);

    return () => clearInterval(timer);
  }, [reservation.expiresAt]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await api.cancelReservation(reservation.id);
      onCancel(reservation.id);
      toast.success("Reservation cancelled");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to cancel reservation"));
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/50 bg-card",
        countdown.isUrgent &&
          !countdown.isExpired &&
          "border-amber-500/50 bg-amber-500/5",
        countdown.isExpired && "border-muted bg-muted/20 opacity-60",
      )}
    >
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          <Link
            href={`/book/${reservation.book.id}`}
            className="relative mx-auto h-40 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-muted sm:mx-0 sm:h-32 sm:w-20"
          >
            {!loaded && <Skeleton className="absolute inset-0" />}
            <Image
              src={toCoverUrl(reservation.book.coverUrl)}
              alt={reservation.book.title}
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
                  countdown.isExpired
                    ? "secondary"
                    : countdown.isUrgent
                      ? "destructive"
                      : "outline"
                }
                className="mb-2 text-[10px]"
              >
                <Timer className="mr-1 h-3 w-3" />
                {countdown.text}
              </Badge>
              <Link href={`/book/${reservation.book.id}`}>
                <h3 className="line-clamp-1 font-semibold text-foreground hover:text-primary">
                  {reservation.book.title}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground">
                {reservation.book.author}
              </p>
              <div className="mt-3 space-y-1">
                <Progress
                  value={countdown.progress}
                  className={cn(
                    "h-1.5",
                    countdown.isUrgent && "[&>div]:bg-amber-500",
                    countdown.isExpired && "[&>div]:bg-muted-foreground",
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Reserved at{" "}
                  {new Date(reservation.reservedAt).toLocaleTimeString(
                    "en-US",
                    { hour: "numeric", minute: "2-digit", hour12: true },
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3">
              {!countdown.isExpired ? (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 rounded-lg"
                    asChild
                  >
                    <Link href={`/book/${reservation.book.id}`}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Collect
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg text-muted-foreground hover:text-destructive"
                        disabled={isCancelling}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel reservation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will cancel your reservation for{" "}
                          {reservation.book.title}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Reservation</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancel}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Cancel Reservation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  This reservation has expired
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReservedPage() {
  const allowed = useProtectedPage({ redirectPath: "/reserved" });

  const [reservations, setReservations] = React.useState<ReservationRecord[]>(
    [],
  );
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!allowed) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await api.getMyReservations();
        if (!cancelled) {
          setReservations(rows);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Unable to load reservations"));
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

  const activeReservations = reservations.filter(
    (reservation) => reservation.status === "ACTIVE",
  );

  if (!allowed) {
    return <div className="py-8" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Reserved Books
            </h1>
            <p className="text-muted-foreground">
              Collect your reserved books within 2 hours
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          {activeReservations.length} active
        </Badge>
      </div>

      {activeReservations.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 p-4 text-sm">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-amber-800 dark:text-amber-200">
            Reservations expire after 2 hours. Please collect from the library
            counter.
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
      ) : activeReservations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeReservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onCancel={(id) =>
                setReservations((current) =>
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
            No reservations
          </h2>
          <p className="mt-1 max-w-sm text-muted-foreground">
            Reserve books to collect them later.
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
