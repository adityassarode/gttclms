"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  BookOpen,
  BookMarked,
  Clock,
  Share2,
  Star,
  Users,
  Calendar,
  Tag,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api, getUploadUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireLoginAction } from "@/lib/route-guards";
import type { Book } from "@/lib/types";
import { getErrorMessage, toCoverUrl } from "@/lib/ui-helpers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const RECENT_BOOKS_KEY = "gttc_recent_books";

function isDigitalBook(book: Book) {
  return (
    Boolean(book.digital) || book.category.toLowerCase() === "digital books"
  );
}

function getPdfHref(book: Book) {
  if (!book.pdfUrl) {
    return null;
  }
  return getUploadUrl(book.pdfUrl) || book.pdfUrl;
}

function saveRecentBook(book: Book) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = localStorage.getItem(RECENT_BOOKS_KEY);
    const current = raw
      ? (JSON.parse(raw) as Array<Record<string, unknown>>)
      : [];
    const next = [
      {
        id: book.id,
        title: book.title,
        author: book.author,
        category: book.category,
        coverUrl: book.coverUrl,
        viewedAt: new Date().toISOString(),
      },
      ...current.filter((item) => item.id !== book.id),
    ].slice(0, 8);
    localStorage.setItem(RECENT_BOOKS_KEY, JSON.stringify(next));
  } catch {
    // ignore local cache failures
  }
}

export default function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const requireLogin = useRequireLoginAction();

  const [book, setBook] = React.useState<Book | null>(null);
  const [relatedBooks, setRelatedBooks] = React.useState<Book[]>([]);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const bookId = params.id;

  React.useEffect(() => {
    if (!bookId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const detail = await api.getBook(bookId);
        if (cancelled) {
          return;
        }

        setBook(detail);
        saveRecentBook(detail);

        const byCategory = await api.getBooks({ category: detail.category });
        if (!cancelled) {
          setRelatedBooks(
            byCategory.filter((item) => item.id !== detail.id).slice(0, 4),
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Unable to load book details"));
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
  }, [bookId]);

  React.useEffect(() => {
    if (!isAuthenticated || !book) {
      setIsFavorite(false);
      return;
    }

    let cancelled = false;

    const loadFavorites = async () => {
      try {
        const rows = await api.getFavorites();
        if (!cancelled) {
          setIsFavorite(rows.some((item) => item.id === book.id));
        }
      } catch {
        if (!cancelled) {
          setIsFavorite(false);
        }
      }
    };

    loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [book, isAuthenticated]);

  const handleBorrow = async () => {
    if (!book || !requireLogin(`/book/${bookId}`)) {
      return;
    }

    if (isDigitalBook(book)) {
      toast.error("Digital books are available online and cannot be borrowed");
      return;
    }

    if (book.copiesAvailable <= 0) {
      toast.error("No copies are currently available");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.borrowBook(book.id);
      setBook({
        ...book,
        copiesAvailable: Math.max(0, book.copiesAvailable - 1),
      });
      toast.success("Book borrowed successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to borrow this book"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReserve = async () => {
    if (!book || !requireLogin(`/book/${bookId}`)) {
      return;
    }

    if (isDigitalBook(book)) {
      toast.error("Digital books are available online and cannot be reserved");
      return;
    }

    if (book.copiesAvailable <= 0) {
      toast.error("No copies are currently available");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.reserveBook(book.id);
      setBook({
        ...book,
        copiesAvailable: Math.max(0, book.copiesAvailable - 1),
      });
      toast.success("Book reserved successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to reserve this book"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFavorite = async () => {
    if (!book || !requireLogin(`/book/${bookId}`)) {
      return;
    }

    const next = !isFavorite;
    setIsFavorite(next);
    try {
      if (next) {
        await api.addFavorite(book.id);
        toast.success("Added to favorites");
      } else {
        await api.removeFavorite(book.id);
        toast.success("Removed from favorites");
      }
    } catch (error) {
      setIsFavorite(!next);
      toast.error(getErrorMessage(error, "Unable to update favorites"));
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[380px_1fr]">
          <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold text-foreground">
          Book not found
        </h2>
        <p className="text-muted-foreground mt-2">
          The requested book does not exist.
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/">Go back home</Link>
        </Button>
      </div>
    );
  }

  const isDigital = isDigitalBook(book);
  const pdfHref = getPdfHref(book);
  const isAvailable = isDigital ? true : book.copiesAvailable > 0;
  const allowGuestActionRedirect = !isAuthenticated;
  const bookRating = isDigital
    ? "4.9"
    : Math.max(
        3.8,
        Math.min(5, 4 + book.copiesAvailable / Math.max(book.copiesTotal, 1)),
      ).toFixed(1);

  return (
    <div className="space-y-8">
      <Button
        variant="ghost"
        className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to browsing
      </Button>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-muted aspect-[2/3] shadow-2xl shadow-primary/10">
            {!imageLoaded && <Skeleton className="absolute inset-0" />}
            <Image
              src={toCoverUrl(book.coverUrl)}
              alt={book.title}
              fill
              className={cn(
                "object-cover transition-opacity duration-500",
                imageLoaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setImageLoaded(true)}
              priority
              sizes="(max-width: 1024px) 100vw, 380px"
            />
          </div>

          <div className="space-y-3">
            {isDigital ? (
              <>
                {pdfHref ? (
                  <Button
                    className="w-full h-12 text-base font-medium rounded-xl"
                    asChild
                  >
                    <a href={pdfHref} target="_blank" rel="noreferrer">
                      <BookOpen className="mr-2 h-5 w-5" />
                      Open PDF
                    </a>
                  </Button>
                ) : (
                  <Button
                    className="w-full h-12 text-base font-medium rounded-xl"
                    disabled
                  >
                    <BookOpen className="mr-2 h-5 w-5" />
                    PDF Unavailable
                  </Button>
                )}
                <p className="px-1 text-xs text-muted-foreground">
                  This is a digital book. Read instantly online.
                </p>
              </>
            ) : (
              <>
                <Button
                  className="w-full h-12 text-base font-medium rounded-xl"
                  disabled={
                    isSubmitting || (!allowGuestActionRedirect && !isAvailable)
                  }
                  onClick={handleBorrow}
                >
                  <BookMarked className="mr-2 h-5 w-5" />
                  {isSubmitting ? "Processing..." : "Borrow Now"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-medium rounded-xl"
                  disabled={
                    isSubmitting || (!allowGuestActionRedirect && !isAvailable)
                  }
                  onClick={handleReserve}
                >
                  <Clock className="mr-2 h-5 w-5" />
                  Reserve for Later
                </Button>
              </>
            )}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1 h-10 rounded-xl"
                onClick={handleFavorite}
              >
                <Heart
                  className={cn(
                    "mr-2 h-4 w-4",
                    isFavorite ? "fill-red-500 text-red-500" : "",
                  )}
                />
                {isFavorite ? "Saved" : "Save"}
              </Button>
              <Button
                variant="secondary"
                className="flex-1 h-10 rounded-xl"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                <Tag className="mr-1 h-3 w-3" />
                {book.category}
              </Badge>
              <Badge
                variant={
                  isDigital
                    ? "secondary"
                    : isAvailable
                      ? "default"
                      : "destructive"
                }
                className="rounded-full"
              >
                {isDigital ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Digital Access
                  </>
                ) : isAvailable ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Available
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 h-3 w-3" />
                    Out of Stock
                  </>
                )}
              </Badge>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              {book.title}
            </h1>
            <p className="mt-2 text-xl text-muted-foreground">
              by {book.author}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Star className="h-5 w-5 fill-accent text-accent" />
              <span className="font-semibold text-foreground">
                {bookRating}
              </span>
              <span className="text-muted-foreground">student rating</span>
            </div>
          </div>

          <Separator />

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              About this book
            </h2>
            <div className="leading-relaxed text-muted-foreground whitespace-pre-line">
              {book.description || "No description available."}
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {isDigital
                        ? "Unlimited digital access"
                        : `${book.copiesAvailable} of ${book.copiesTotal} copies`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isDigital
                        ? "Open the PDF to start reading"
                        : isAvailable
                          ? "Ready to borrow"
                          : "Reserve when available"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Collection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {isDigital ? "Digital Books" : "GTTC Library"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isDigital ? "Community uploads" : "General circulation"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {relatedBooks.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-6 text-xl font-semibold text-foreground">
            You might also like
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedBooks.map((related) => (
              <Link
                key={related.id}
                href={`/book/${related.id}`}
                className="group overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                  <Image
                    src={toCoverUrl(related.coverUrl)}
                    alt={related.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-1 font-medium text-foreground group-hover:text-primary">
                    {related.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {related.author}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
