"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Filter, ArrowRight, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getErrorMessage, toCoverUrl } from "@/lib/ui-helpers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function BookListCard({ book }: { book: Book }) {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <Card className="overflow-hidden border-border/50 bg-card transition-all hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Link
            href={`/book/${book.id}`}
            className="relative h-36 w-24 shrink-0 overflow-hidden rounded-lg bg-muted"
          >
            {!loaded ? <Skeleton className="absolute inset-0" /> : null}
            <Image
              src={toCoverUrl(book.coverUrl)}
              alt={book.title}
              fill
              className={cn(
                "object-cover transition-opacity duration-300",
                loaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setLoaded(true)}
              sizes="96px"
            />
          </Link>
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <Badge variant="outline" className="mb-2 text-[10px]">
                {book.category}
              </Badge>
              <Link href={`/book/${book.id}`}>
                <h2 className="line-clamp-2 font-semibold text-foreground hover:text-primary">
                  {book.title}
                </h2>
              </Link>
              <p className="text-sm text-muted-foreground">{book.author}</p>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {book.description || "No description available."}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {book.copiesAvailable}/{book.copiesTotal} copies
              </span>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/book/${book.id}`}>
                  View
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BooksPage() {
  const [books, setBooks] = React.useState<Book[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");

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

  const categories = React.useMemo(() => {
    return [...new Set(books.map((book) => book.category))].sort();
  }, [books]);

  const filtered = React.useMemo(() => {
    return books.filter((book) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.keywords || "").toLowerCase().includes(q);
      const matchCategory = category === "all" || book.category === category;
      return matchSearch && matchCategory;
    });
  }, [books, category, search]);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Browse Books
        </h1>
        <p className="text-muted-foreground">
          Explore the full catalog and open any title for detailed availability.
        </p>
      </section>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, author, or keyword"
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Card key={index} className="border-border/50 bg-card">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-36 w-24 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length ? (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {books.length} books
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((book) => (
              <BookListCard key={book.id} book={book} />
            ))}
          </div>
        </>
      ) : (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              No books found
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Try changing your search text or category filter.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setCategory("all");
              }}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
