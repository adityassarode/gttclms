"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2, BookMarked, ArrowRight, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useProtectedPage } from "@/lib/route-guards";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getErrorMessage, toCoverUrl } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

function FavoriteCard({
  book,
  onRemove,
}: {
  book: Book;
  onRemove: (book: Book) => void;
}) {
  const [imageLoaded, setImageLoaded] = React.useState(false);

  return (
    <Card className="group overflow-hidden border-border/50 bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          <Link
            href={`/book/${book.id}`}
            className="relative mx-auto flex-shrink-0 sm:mx-0"
          >
            <div className="relative h-40 w-28 overflow-hidden rounded-lg bg-muted sm:h-36 sm:w-24">
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
                sizes="96px"
              />
            </div>
          </Link>

          <div className="flex flex-1 flex-col justify-between py-1">
            <div>
              <Badge variant="outline" className="mb-2 text-[10px] font-normal">
                {book.category}
              </Badge>
              <Link href={`/book/${book.id}`}>
                <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {book.title}
                </h3>
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {book.author}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {book.copiesAvailable}/{book.copiesTotal} copies available
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3">
              <Button
                variant="default"
                size="sm"
                className="h-8 rounded-lg"
                asChild
              >
                <Link href={`/book/${book.id}`}>
                  <BookMarked className="mr-1.5 h-3.5 w-3.5" />
                  View
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove from favorites?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes &quot;{book.title}&quot; from your favorites
                      list.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onRemove(book)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Remove
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

export default function FavoritesPage() {
  const allowed = useProtectedPage({ redirectPath: "/favorites" });

  const [favorites, setFavorites] = React.useState<Book[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!allowed) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await api.getFavorites();
        if (!cancelled) {
          setFavorites(rows);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Unable to load favorites"));
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

  const handleRemove = async (book: Book) => {
    const previous = [...favorites];
    setFavorites((current) => current.filter((item) => item.id !== book.id));

    try {
      await api.removeFavorite(book.id);
      toast.success("Removed from favorites");
    } catch (error) {
      setFavorites(previous);
      toast.error(getErrorMessage(error, "Unable to update favorites"));
    }
  };

  if (!allowed) {
    return <div className="py-8" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
            <Heart className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Your Favorites
            </h1>
            <p className="text-muted-foreground">
              Quick access to books you want to read
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          {favorites.length} books
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border-border/50 bg-card">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
                <Skeleton className="h-36 w-24 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : favorites.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((book) => (
            <FavoriteCard key={book.id} book={book} onRemove={handleRemove} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            No favorites yet
          </h2>
          <p className="mt-1 max-w-sm text-muted-foreground">
            Browse books and save your favorites for quick access.
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
