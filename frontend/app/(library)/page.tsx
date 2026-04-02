"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Heart,
  ArrowRight,
  BookOpen,
  Sparkles,
  TrendingUp,
  Clock,
  Filter,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireLoginAction } from "@/lib/route-guards";
import type { Book } from "@/lib/types";
import { getErrorMessage, toCoverUrl, toIsoDate } from "@/lib/ui-helpers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const RECENT_BOOKS_KEY = "gttc_recent_books";

interface RecentBook {
  id: number;
  title: string;
  author: string;
  category: string;
  coverUrl?: string | null;
  viewedAt: string;
}

function FeaturedBook({ book }: { book: Book }) {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <Link
      href={`/book/${book.id}`}
      className="group min-w-[180px] rounded-2xl border border-border/50 bg-card p-4 transition-all hover:-translate-y-1 hover:shadow-lg sm:min-w-[200px]"
    >
      <div className="relative mx-auto h-44 w-28 overflow-hidden rounded-lg bg-muted sm:h-48 sm:w-32">
        {!loaded && <Skeleton className="absolute inset-0" />}
        <Image
          src={toCoverUrl(book.coverUrl)}
          alt={book.title}
          fill
          className={cn(
            "object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoaded(true)}
          sizes="128px"
        />
      </div>
      <h3 className="mt-4 line-clamp-1 font-medium text-foreground group-hover:text-primary">
        {book.title}
      </h3>
      <p className="text-sm text-muted-foreground">{book.author}</p>
    </Link>
  );
}

function BookCard({
  book,
  isFavorite,
  onFavorite,
}: {
  book: Book;
  isFavorite: boolean;
  onFavorite: (book: Book) => void;
}) {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <Card className="overflow-hidden border-border/50 bg-card transition-all hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          <Link
            href={`/book/${book.id}`}
            className="relative mx-auto h-44 w-32 overflow-hidden rounded-lg bg-muted sm:mx-0 sm:h-40 sm:w-28"
          >
            {!loaded && <Skeleton className="absolute inset-0" />}
            <Image
              src={toCoverUrl(book.coverUrl)}
              alt={book.title}
              fill
              className={cn(
                "object-cover transition-opacity duration-300",
                loaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setLoaded(true)}
              sizes="112px"
            />
          </Link>
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <Badge variant="outline" className="mb-2 text-[10px]">
                {book.category}
              </Badge>
              <Link href={`/book/${book.id}`}>
                <h3 className="line-clamp-2 font-semibold text-foreground hover:text-primary">
                  {book.title}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground">{book.author}</p>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {book.description || "No description available."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
              <span className="text-xs text-muted-foreground">
                {book.copiesAvailable}/{book.copiesTotal} copies
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onFavorite(book)}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isFavorite
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground",
                    )}
                  />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href={`/book/${book.id}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const queryInUrl = searchParams.get("q") || "";
  const { isAuthenticated } = useAuth();
  const requireLogin = useRequireLoginAction();

  const [books, setBooks] = React.useState<Book[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [favorites, setFavorites] = React.useState<Set<number>>(new Set());
  const [recent, setRecent] = React.useState<RecentBook[]>([]);

  React.useEffect(() => {
    setSearch(queryInUrl);
  }, [queryInUrl]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const rows = await api.getBooks();
        if (!cancelled) {
          setBooks(rows);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Unable to load books"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = localStorage.getItem(RECENT_BOOKS_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as RecentBook[];
      setRecent(parsed.slice(0, 3));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setFavorites(new Set());
      return;
    }

    let cancelled = false;
    const loadFavorites = async () => {
      try {
        const rows = await api.getFavorites();
        if (!cancelled) {
          setFavorites(new Set(rows.map((row) => row.id)));
        }
      } catch {
        if (!cancelled) {
          setFavorites(new Set());
        }
      }
    };

    loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const categories = React.useMemo(() => {
    const map = new Map<string, number>();
    books.forEach((book) => {
      map.set(book.category, (map.get(book.category) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [books]);

  const featured = React.useMemo(() => {
    const featuredBooks = books.filter((book) => book.featured);
    return (featuredBooks.length ? featuredBooks : books).slice(0, 8);
  }, [books]);

  const filtered = React.useMemo(() => {
    return books.filter((book) => {
      const matchSearch =
        !search ||
        book.title.toLowerCase().includes(search.toLowerCase()) ||
        book.author.toLowerCase().includes(search.toLowerCase()) ||
        (book.keywords || "").toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "all" || book.category === category;
      return matchSearch && matchCategory;
    });
  }, [books, search, category]);

  const toggleFavorite = async (book: Book) => {
    if (!requireLogin(`/book/${book.id}`)) {
      return;
    }

    const previous = new Set(favorites);
    const next = new Set(favorites);
    if (next.has(book.id)) {
      next.delete(book.id);
    } else {
      next.add(book.id);
    }
    setFavorites(next);

    try {
      if (previous.has(book.id)) {
        await api.removeFavorite(book.id);
        toast.success("Removed from favorites");
      } else {
        await api.addFavorite(book.id);
        toast.success("Added to favorites");
      }
    } catch (error) {
      setFavorites(previous);
      toast.error(getErrorMessage(error, "Unable to update favorites"));
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 sm:p-8 lg:p-12">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium">Discover Your Next Read</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
          Find books that match your
          <br />
          <span className="text-primary">curiosity and goals</span>
        </h1>
        <p className="mt-4 max-w-lg text-muted-foreground">
          Public access includes dashboard, list, details, and search.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, author, or keyword..."
              className="h-12 pl-11"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-12 w-full sm:w-[220px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((item) => (
                <SelectItem key={item.name} value={item.name}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Trending This Week
              </h2>
              <p className="text-sm text-muted-foreground">
                Featured and popular books
              </p>
            </div>
          </div>
        </div>
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="min-w-[200px] rounded-2xl border border-border/50 bg-card p-4"
                >
                  <Skeleton className="mx-auto h-48 w-32 rounded-lg" />
                  <Skeleton className="mx-auto mt-4 h-4 w-3/4" />
                </div>
              ))
            : featured.map((book) => (
                <FeaturedBook key={book.id} book={book} />
              ))}
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <History className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Recently Viewed
              </h2>
              <p className="text-sm text-muted-foreground">
                Continue where you left off
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="self-start sm:self-auto"
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem(RECENT_BOOKS_KEY);
              }
              setRecent([]);
            }}
          >
            Clear history
          </Button>
        </div>
        {recent.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((item) => (
              <Link
                key={item.id}
                href={`/book/${item.id}`}
                className="rounded-2xl border border-border/50 bg-card p-4"
              >
                <p className="font-medium text-foreground line-clamp-1">
                  {item.title}
                </p>
                <p className="text-sm text-muted-foreground">{item.author}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Viewed {toIsoDate(item.viewedAt)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-sm text-muted-foreground">
            Open a book to add it to your recent history.
          </div>
        )}
      </section>

      <section>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Clock className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">All Books</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} results
            </p>
          </div>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="border-border/50 bg-card">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
                  <Skeleton className="h-40 w-28 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                isFavorite={favorites.has(book.id)}
                onFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground">
              No books found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or filter.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
