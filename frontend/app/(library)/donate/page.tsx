"use client";

import * as React from "react";
import Image from "next/image";
import {
  Gift,
  Upload,
  CheckCircle,
  BookOpen,
  Users,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useProtectedPage } from "@/lib/route-guards";
import { getErrorMessage } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export default function DonatePage() {
  const allowed = useProtectedPage({ redirectPath: "/donate" });

  const [form, setForm] = React.useState({
    title: "",
    author: "",
    description: "",
    copies: 1,
  });
  const [files, setFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);

    if (selected.length > 2) {
      toast.error("Upload up to 2 images");
      return;
    }

    const largeFile = selected.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (largeFile) {
      toast.error("Each image must be under 2MB");
      return;
    }

    setFiles(selected);
  };

  const removeFile = (index: number) => {
    setFiles((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.title || !form.author) {
      toast.error("Title and author are required");
      return;
    }

    const payload = new FormData();
    payload.append("title", form.title);
    payload.append("author", form.author);
    payload.append("description", form.description);
    payload.append("copies", String(form.copies));

    if (files[0]) {
      payload.append("image1", files[0]);
    }
    if (files[1]) {
      payload.append("image2", files[1]);
    }

    setIsSubmitting(true);
    try {
      await api.submitDonation(payload);
      setIsSubmitted(true);
      setForm({ title: "", author: "", description: "", copies: 1 });
      setFiles([]);
      toast.success("Donation submitted successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Donation submission failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!allowed) {
    return <div className="py-8" />;
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground">
          Thank You for Your Donation
        </h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          Your donation request was sent to the library team. We appreciate your
          contribution.
        </p>
        <Button onClick={() => setIsSubmitted(false)}>
          Donate Another Book
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Donate a Book
        </h1>
        <p className="mt-1 text-muted-foreground">
          Share knowledge by donating books to the library.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">
              Expand the Collection
            </h3>
            <p className="text-sm text-muted-foreground">
              Help us grow the library for everyone.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">
              Help Students
            </h3>
            <p className="text-sm text-muted-foreground">
              Make quality books more accessible.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Sparkles className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">Give Back</h3>
            <p className="text-sm text-muted-foreground">
              Contribute directly to campus learning.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Book Information</CardTitle>
              <CardDescription>
                Provide details about your donation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Book Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter the book title"
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  placeholder="Enter the author name"
                  value={form.author}
                  onChange={(event) =>
                    setForm({ ...form, author: event.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Book condition, edition, notes..."
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className="min-h-[100px]"
              />
            </div>

            <div className="w-full max-w-[220px] space-y-2">
              <Label htmlFor="copies">Number of copies *</Label>
              <Input
                id="copies"
                type="number"
                min={1}
                max={20}
                value={form.copies}
                onChange={(event) =>
                  setForm({ ...form, copies: Number(event.target.value) || 1 })
                }
                required
              />
            </div>

            <div className="space-y-3">
              <Label>Book Images (optional, max 2)</Label>
              <div className="flex flex-wrap gap-3">
                {files.map((file, index) => (
                  <div
                    key={file.name}
                    className="relative group h-24 w-24 overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {files.length < 2 && (
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
                    <Upload className="mb-1 h-5 w-5" />
                    <span className="text-xs">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() =>
                  setForm({ title: "", author: "", description: "", copies: 1 })
                }
              >
                Reset
              </Button>
              <Button
                type="submit"
                className="w-full gap-2 sm:w-auto"
                disabled={isSubmitting}
              >
                <Gift className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit Donation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
