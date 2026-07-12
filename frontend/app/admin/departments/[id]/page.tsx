"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Department, DepartmentResource } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DepartmentResourceActions } from "@/components/department-resource-viewer";
import { Loader2, Upload, ArrowLeft } from "lucide-react";

type RouteParams = { id: string };

export default function AdminDepartmentDetail({ params }: { params: RouteParams | Promise<RouteParams> }) {
  const [id, setId] = React.useState<string | null>(null);
  const [department, setDepartment] = React.useState<Department | null>(null);
  const [resources, setResources] = React.useState<DepartmentResource[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [folder, setFolder] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    void Promise.resolve(params).then((resolved) => {
      if (mounted) setId(resolved.id);
    });
    return () => {
      mounted = false;
    };
  }, [params]);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [dept, rows] = await Promise.all([
        api.getAdminDepartment(id),
        api.getAdminDepartmentResources(id),
      ]);
      setDepartment(dept);
      setResources(rows || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load department resources",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    if (id) void load();
  }, [id, load]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) {
      toast.error("Department is still loading");
      return;
    }

    if (!file) {
      toast.error("Select a file to upload");
      return;
    }

    setUploading(true);
    try {
      await api.uploadDepartmentResource(
        id,
        file,
        title.trim(),
        description.trim(),
        folder.trim(),
      );
      toast.success("File uploaded");
      setFile(null);
      setTitle("");
      setDescription("");
      setFolder("");
      const input = document.getElementById(
        "department-file",
      ) as HTMLInputElement | null;
      if (input) input.value = "";
      void load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload file",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 overflow-hidden">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/admin/departments"><ArrowLeft className="mr-2 h-4 w-4" /> Back to departments</Link>
      </Button>

      <div className="min-w-0">
        <h1 className="break-words text-2xl font-semibold">{department?.name || "Department files"}</h1>
        <p className="break-words text-sm text-muted-foreground">Upload and review files shown on this department page.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Upload className="h-4 w-4" /> Upload File</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="min-w-0">
                <Label htmlFor="department-file">File *</Label>
                <Input id="department-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <div className="min-w-0">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={file?.name || "Display title"} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="min-w-0">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="min-w-0">
                <Label htmlFor="folder">Folder / category</Label>
                <Input id="folder" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="General" />
              </div>
            </div>
            <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Upload File
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Uploaded Files</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> : null}
          {!loading && resources.length === 0 ? <p className="text-sm text-muted-foreground">No files uploaded yet.</p> : null}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {resources.map((r) => (
              <div key={r.id} className="min-w-0 rounded-md border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="break-words font-medium">{r.title}</div>
                    <div className="break-words text-xs text-muted-foreground">{r.folder || "General"}</div>
                    <p className="break-words text-sm text-muted-foreground">{r.description || "No description."}</p>
                    <p className="break-all text-xs text-muted-foreground">{r.fileType || "Unknown file type"}</p>
                  </div>
                  <DepartmentResourceActions resource={r} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
