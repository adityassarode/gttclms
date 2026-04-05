"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  Link2,
  Plus,
  ExternalLink,
  Trash2,
  BookOpen,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api, getUploadUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Book } from "@/lib/types";
import { getErrorMessage, toCoverUrl } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MAX_DIGITAL_BOOKS_PER_USER = 2;
const MAX_PDF_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function isDigitalBook(book: Book) {
  return (
    Boolean(book.digital) || book.category.toLowerCase() === "digital books"
  );
}

function resolvePdfHref(book: Book) {
  if (!book.pdfUrl) {
    return null;
  }
  return getUploadUrl(book.pdfUrl) || book.pdfUrl;
}

function DigitalBookCard({
  book,
  onRemove,
  removing,
}: {
  book: Book;
  onRemove?: (book: Book) => void;
  removing?: boolean;
}) {
  const [coverLoaded, setCoverLoaded] = React.useState(false);
  const pdfHref = resolvePdfHref(book);
  const hasCover = Boolean(book.coverUrl);

  return (
    <Card className="border-border/50 bg-card transition-all hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="space-y-4 p-4">
        {hasCover ? (
          <div className="relative h-36 overflow-hidden rounded-lg bg-muted">
            {!coverLoaded ? <Skeleton className="absolute inset-0" /> : null}
            <Image
              src={toCoverUrl(book.coverUrl)}
              alt={book.title}
              fill
              className="object-cover"
              onLoad={() => setCoverLoaded(true)}
              sizes="(max-width: 768px) 100vw, 320px"
            />
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground">
            <ImageIcon className="mr-2 h-4 w-4" />
            No cover image
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="line-clamp-1 font-semibold text-foreground">
              {book.title}
            </h3>
            <p className="text-sm text-muted-foreground">{book.author}</p>
          </div>
          <Badge variant="secondary">Digital</Badge>
        </div>

        <p className="line-clamp-3 text-sm text-muted-foreground">
          {book.description || "No description provided."}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {pdfHref ? (
            <Button size="sm" className="rounded-lg" asChild>
              <a href={pdfHref} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open PDF
              </a>
            </Button>
          ) : (
            <Button size="sm" disabled>
              PDF Unavailable
            </Button>
          )}

          {onRemove ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg text-destructive hover:text-destructive"
              onClick={() => onRemove(book)}
              disabled={removing}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">Category: Digital Books</p>
      </CardContent>
    </Card>
  );
}

export default function DigitalBooksPage() {
  const router = useRouter();
  const { isReady, user } = useAuth();
  const allowed = isReady && Boolean(user);

  const [title, setTitle] = React.useState("");
  const [author, setAuthor] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [pdfUrl, setPdfUrl] = React.useState("");
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [coverImage, setCoverImage] = React.useState<File | null>(null);

  const [allBooks, setAllBooks] = React.useState<Book[]>([]);
  const [myBooks, setMyBooks] = React.useState<Book[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const coverImageRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace("/login?redirect=%2Fdigital");
    }
  }, [isReady, router, user]);

  React.useEffect(() => {
    if (!allowed) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [all, mine] = await Promise.all([
          api.getDigitalBooks(),
          api.getMyDigitalBooks(),
        ]);

        if (!cancelled) {
          setAllBooks(all.filter(isDigitalBook));
          setMyBooks(mine.filter(isDigitalBook));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Unable to load digital books"));
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

  const handleAddBook = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !author.trim()) {
      toast.error("Title and author are required");
      return;
    }

    if (!pdfFile && !pdfUrl.trim()) {
      toast.error("Upload a PDF file or provide a PDF link");
      return;
    }

    if (myBooks.length >= MAX_DIGITAL_BOOKS_PER_USER) {
      toast.error("You can upload up to 2 digital books only");
      return;
    }

    if (pdfFile && pdfFile.size > MAX_PDF_BYTES) {
      toast.error("PDF size must be 2MB or less");
      return;
    }

    if (coverImage && coverImage.size > MAX_IMAGE_BYTES) {
      toast.error("Cover image size must be 2MB or less");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createDigitalBook({
        title,
        author,
        description,
        pdfUrl: pdfUrl.trim() || undefined,
        pdfFile: pdfFile || undefined,
        coverImage: coverImage || undefined,
      });

      setAllBooks((current) => [created, ...current]);
      setMyBooks((current) => [created, ...current]);

      setTitle("");
      setAuthor("");
      setDescription("");
      setPdfUrl("");
      setPdfFile(null);
      setCoverImage(null);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      if (coverImageRef.current) {
        coverImageRef.current.value = "";
      }

      toast.success("Digital book added successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add digital book"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveBook = async (book: Book) => {
    const id = String(book.id);
    setRemovingId(id);
    try {
      await api.deleteDigitalBook(book.id);
      setMyBooks((current) => current.filter((item) => String(item.id) !== id));
      setAllBooks((current) =>
        current.filter((item) => String(item.id) !== id),
      );
      toast.success("Digital book removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove digital book"));
    } finally {
      setRemovingId(null);
    }
  };

  if (!allowed) {
    return <div className="py-8" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Digital Books
            </h1>
            <p className="text-muted-foreground">
              Add PDFs for everyone and manage books you uploaded.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Add Digital Book
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddBook} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter book title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                  placeholder="Enter author name"
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What is this book about?"
                  rows={3}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pdfUrl" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  PDF Link
                </Label>
                <Input
                  id="pdfUrl"
                  value={pdfUrl}
                  onChange={(event) => setPdfUrl(event.target.value)}
                  placeholder="https://example.com/book.pdf"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pdfFile" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload PDF
                </Label>
                <Input
                  id="pdfFile"
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) =>
                    setPdfFile(event.target.files?.[0] || null)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Provide either a PDF link or upload a PDF file. PDF must be
                  2MB or less. Max 2 digital books per user.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="coverImage" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Cover Image (optional)
                </Label>
                <Input
                  id="coverImage"
                  ref={coverImageRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setCoverImage(event.target.files?.[0] || null)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Upload JPG, PNG, WEBP, or GIF up to 2MB.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={
                isSubmitting || myBooks.length >= MAX_DIGITAL_BOOKS_PER_USER
              }
              className="rounded-xl"
            >
              {isSubmitting
                ? "Adding..."
                : myBooks.length >= MAX_DIGITAL_BOOKS_PER_USER
                  ? "Limit Reached"
                  : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full max-w-full grid-cols-2 sm:max-w-md">
          <TabsTrigger value="all" className="gap-2">
            <BookOpen className="h-4 w-4" />
            All Digital Books
          </TabsTrigger>
          <TabsTrigger value="mine" className="gap-2">
            <FileText className="h-4 w-4" />
            Remove Books
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="space-y-3 p-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : allBooks.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allBooks.map((book) => (
                <DigitalBookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-card p-6 text-center text-muted-foreground">
              No digital books added yet.
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine">
          {myBooks.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myBooks.map((book) => (
                <DigitalBookCard
                  key={book.id}
                  book={book}
                  onRemove={handleRemoveBook}
                  removing={removingId === String(book.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
              <p className="text-muted-foreground">
                You have not uploaded any digital books yet.
              </p>
              <Button className="mt-4" variant="outline" asChild>
                <Link href="/digital">Add your first digital book</Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
