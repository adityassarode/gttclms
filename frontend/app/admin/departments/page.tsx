"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Department } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Edit, FolderOpen } from "lucide-react";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  logoUrl: "",
  published: true,
};

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | number | null>(null);
  const [form, setForm] = React.useState(emptyForm);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.getAdminDepartments();
      setDepartments(rows || []);
    } catch {
      toast.error("Unable to load departments");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        logoUrl: form.logoUrl.trim(),
        published: form.published,
      };
      if (editingId) {
        await api.updateDepartment(editingId, payload);
        toast.success("Department updated");
      } else {
        await api.createDepartment(payload);
        toast.success("Department created");
      }
      resetForm();
      void load();
    } catch {
      toast.error(editingId ? "Unable to update department" : "Unable to create department");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (department: Department) => {
    setEditingId(department.id);
    setForm({
      name: department.name || "",
      slug: department.slug || "",
      description: department.description || "",
      logoUrl: department.logoUrl || "",
      published: Boolean(department.published),
    });
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Delete this department?")) return;
    try {
      await api.deleteDepartment(id);
      toast.success("Department deleted");
      if (editingId === id) resetForm();
      void load();
    } catch {
      toast.error("Unable to delete department");
    }
  };

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-semibold">Departments</h1>
        <p className="text-sm text-muted-foreground">
          Admins can create, edit, publish, delete, and upload files for every department.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-4 w-4" /> {editingId ? "Edit Department" : "Add Department"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="min-w-0">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="min-w-0">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="min-w-0">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="min-w-0">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input id="logoUrl" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Published on the main website
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingId ? "Save Changes" : "Create Department"}
              </Button>
              {editingId ? <Button type="button" variant="outline" onClick={resetForm}>Cancel Edit</Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Existing Departments</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> : null}
          {!loading && departments.length === 0 ? <p className="text-sm text-muted-foreground">No departments yet.</p> : null}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {departments.map((d) => (
              <div key={d.id} className="min-w-0 rounded-md border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="break-words font-medium">{d.name}</div>
                    <div className="break-all text-xs text-muted-foreground">/{d.slug}</div>
                    <p className="break-words text-sm text-muted-foreground">{d.description || "No description provided."}</p>
                    <p className="text-xs text-muted-foreground">{d.published ? "Published" : "Hidden from website"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button asChild variant="outline" size="sm"><Link href={`/admin/departments/${d.id}`}><FolderOpen className="mr-1 h-4 w-4" /> Files</Link></Button>
                    <Button asChild variant="outline" size="sm"><Link href={`/departments/${d.id}`}>View</Link></Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(d)}><Edit className="mr-1 h-4 w-4" /> Edit</Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(d.id)}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
