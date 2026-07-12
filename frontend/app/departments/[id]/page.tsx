"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DepartmentResource, Department } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";

type Props = { params: { id: string } };

export default function DepartmentPage({ params }: Props) {
  const id = params.id;
  const [department, setDepartment] = React.useState<Department | null>(null);
  const [resources, setResources] = React.useState<DepartmentResource[]>([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    void Promise.all([api.getDepartment(id), api.getDepartmentResources(id)])
      .then(([d, r]) => {
        if (!mounted) return;
        setDepartment(d);
        setResources(r || []);
      })
      .catch(() => {
        if (!mounted) return;
        setDepartment(null);
        setResources([]);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [id]);

  const onLocalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.getDepartmentResources(id, { q: query.trim() });
      setResources(r || []);
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && department === null) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h2 className="break-words text-xl font-semibold">Department not found</h2>
        <p className="break-words text-sm text-muted-foreground">The requested department does not exist or is not published.</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 w-fit">
        <Link href="/departments"><ArrowLeft className="mr-2 h-4 w-4" /> Departments</Link>
      </Button>

      <div className="mb-6 min-w-0 space-y-2">
        <h1 className="break-words text-2xl font-semibold sm:text-3xl">{department?.name || "Department"}</h1>
        {department?.description ? <p className="max-w-3xl break-words text-sm text-muted-foreground sm:text-base">{department.description}</p> : null}
      </div>

      <form onSubmit={onLocalSearch} className="mb-6 flex flex-col gap-2 sm:flex-row">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search within this department..." className="min-w-0 flex-1" />
        <Button type="submit" className="w-full sm:w-auto">Search</Button>
      </form>

      {loading ? <p className="text-sm text-muted-foreground">Loading resources...</p> : null}
      {!loading && resources.length === 0 ? <p className="text-sm text-muted-foreground">No resources found.</p> : null}

      <div className="grid grid-cols-1 gap-4">
        {resources.map((res) => (
          <article key={res.id} className="min-w-0 rounded-lg border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h3 className="break-words text-base font-medium">{res.title}</h3>
                <p className="break-words text-xs text-muted-foreground">{res.folder || "General"}</p>
                <p className="break-words text-sm text-muted-foreground">{res.description || "No description provided."}</p>
                <p className="break-all text-xs text-muted-foreground">{res.fileType || "File"}</p>
              </div>

              {res.fileUrl ? (
                <Button asChild variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
                  <a href={res.fileUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> View / Download</a>
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">No file</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
