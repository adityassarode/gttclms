"use client";

import * as React from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  Book,
  Edit,
  Trash2,
  Filter,
  Grid3X3,
  List,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Book as BookType } from "@/lib/types";
import { getErrorMessage, toCoverUrl } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface BookForm {
  title: string;
  author: string;
  description: string;
  category: string;
  keywords: string;
  coverUrl: string;
  copiesTotal: number;
  featured: boolean;
}

const emptyForm: BookForm = {
  title: "",
  author: "",
  description: "",
  category: "",
  keywords: "",
  coverUrl: "",
  copiesTotal: 1,
  featured: false,
};

export default function AdminBooksPage() {
  const [books, setBooks] = React.useState<BookType[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState<BookType | null>(null);
  const [form, setForm] = React.useState<BookForm>(emptyForm);

  const loadBooks = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await api.getBooks();
      setBooks(rows);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load books"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const categories = React.useMemo(() => {
    return [...new Set(books.map((book) => book.category))].sort();
  }, [books]);

  const filteredBooks = React.useMemo(() => {
    return books.filter((book) => {
      const matchesSearch =
        !searchQuery ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.keywords || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || book.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [books, searchQuery, selectedCategory]);

  const totalCopies = books.reduce((sum, book) => sum + book.copiesTotal, 0);
  const availableCopies = books.reduce(
    (sum, book) => sum + book.copiesAvailable,
    0,
  );

  const openCreateDialog = () => {
    setEditingBook(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (book: BookType) => {
    setEditingBook(book);
    setForm({
      title: book.title,
      author: book.author,
      description: book.description || "",
      category: book.category,
      keywords: book.keywords || "",
      coverUrl: book.coverUrl || "",
      copiesTotal: book.copiesTotal,
      featured: book.featured,
    });
    setDialogOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.title || !form.author || !form.category) {
      toast.error("Title, author, and category are required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingBook) {
        await api.updateBook(editingBook.id, form);
        toast.success("Book updated");
      } else {
        await api.createBook(form);
        toast.success("Book created");
      }
      setDialogOpen(false);
      await loadBooks();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save book"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (book: BookType) => {
    try {
      await api.deleteBook(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
      toast.success("Book deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete book"));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Book Inventory
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage titles, stock levels, and featured books
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full gap-2 sm:w-auto"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>
                {editingBook ? "Edit Book" : "Add New Book"}
              </DialogTitle>
              <DialogDescription>
                {editingBook
                  ? "Update the selected book details."
                  : "Enter details for the new catalog entry."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="author">Author *</Label>
                  <Input
                    id="author"
                    value={form.author}
                    onChange={(event) =>
                      setForm({ ...form, author: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="copies">Total Copies *</Label>
                  <Input
                    id="copies"
                    type="number"
                    min={1}
                    value={form.copiesTotal}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        copiesTotal: Number(event.target.value) || 1,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="keywords">Keywords</Label>
                  <Input
                    id="keywords"
                    value={form.keywords}
                    onChange={(event) =>
                      setForm({ ...form, keywords: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cover">Cover URL</Label>
                  <Input
                    id="cover"
                    value={form.coverUrl}
                    onChange={(event) =>
                      setForm({ ...form, coverUrl: event.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Feature this book
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Shows in public dashboard highlights
                  </p>
                </div>
                <Button
                  type="button"
                  variant={form.featured ? "default" : "outline"}
                  onClick={() => setForm({ ...form, featured: !form.featured })}
                >
                  {form.featured ? "Featured" : "Not Featured"}
                </Button>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editingBook ? "Update Book" : "Create Book"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by title, author, or keyword..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full sm:w-[190px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1 self-start rounded-lg border border-border/50 p-1 sm:self-auto">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Book className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{books.length}</p>
                <p className="text-sm text-muted-foreground">Total Titles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{totalCopies}</p>
            <p className="text-sm text-muted-foreground">Total Copies</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{availableCopies}</p>
            <p className="text-sm text-muted-foreground">Available Copies</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">
              {books.filter((book) => book.featured).length}
            </p>
            <p className="text-sm text-muted-foreground">Featured Titles</p>
          </CardContent>
        </Card>
      </div>

      {viewMode === "list" ? (
        <Card className="overflow-hidden border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-3 py-4 text-left text-sm font-medium text-muted-foreground sm:px-6">
                    Book
                  </th>
                  <th className="px-3 py-4 text-left text-sm font-medium text-muted-foreground sm:px-6">
                    Category
                  </th>
                  <th className="px-3 py-4 text-left text-sm font-medium text-muted-foreground sm:px-6">
                    Availability
                  </th>
                  <th className="px-3 py-4 text-left text-sm font-medium text-muted-foreground sm:px-6">
                    Flags
                  </th>
                  <th className="px-3 py-4 text-right text-sm font-medium text-muted-foreground sm:px-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr
                    key={book.id}
                    className="border-b border-border/30 hover:bg-muted/20"
                  >
                    <td className="px-3 py-4 sm:px-6">
                      <div className="flex items-center gap-4">
                        <div className="relative h-14 w-10 overflow-hidden rounded-md bg-muted">
                          <Image
                            src={toCoverUrl(book.coverUrl)}
                            alt={book.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {book.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {book.author}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm sm:px-6">
                      {book.category}
                    </td>
                    <td className="px-3 py-4 text-sm sm:px-6">
                      {book.copiesAvailable}/{book.copiesTotal}
                    </td>
                    <td className="px-3 py-4 sm:px-6">
                      {book.featured ? (
                        <Badge variant="secondary">Featured</Badge>
                      ) : (
                        <Badge variant="outline">Standard</Badge>
                      )}
                    </td>
                    <td className="px-3 py-4 text-right sm:px-6">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(book)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this book?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {book.title} from
                                the catalog.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDelete(book)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map((book) => (
            <Card
              key={book.id}
              className="overflow-hidden border-border/50 bg-card/50 transition-all hover:shadow-lg"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                <Image
                  src={toCoverUrl(book.coverUrl)}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="300px"
                />
                {book.featured ? (
                  <Badge className="absolute right-3 top-3">Featured</Badge>
                ) : null}
              </div>
              <CardContent className="p-4">
                <h3 className="line-clamp-1 font-medium text-foreground">
                  {book.title}
                </h3>
                <p className="text-sm text-muted-foreground">{book.author}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{book.category}</span>
                  <span className="font-medium">
                    {book.copiesAvailable}/{book.copiesTotal}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(book)}
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this book?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove {book.title} from the
                          catalog.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDelete(book)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Refreshing catalog...</p>
      ) : null}
    </div>
  );
}
