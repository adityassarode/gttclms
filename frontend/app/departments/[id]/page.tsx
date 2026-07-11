"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { DepartmentResource, Department } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  if (!loading && department === null) {
    return (
      <div className="container mx-auto py-8">
        <h2 className="text-xl font-semibold">Department not found</h2>
        <p className="text-sm text-muted-foreground">
          The requested department does not exist or is not published.
        </p>
      </div>
    );
  }

  const onLocalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.getDepartmentResources(id, { q: query.trim() });
      setResources(r || []);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-semibold">
          {department?.name || "Department"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {department?.description}
        </p>
      </div>

      <form onSubmit={onLocalSearch} className="mb-4 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search within this department..."
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>

      {loading ? <p>Loading...</p> : null}

      <div className="space-y-4">
        {resources.map((res) => (
          <div key={res.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">{res.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {res.folder || "General"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {res.description}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {res.fileUrl ? (
                  <a
                    href={res.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary"
                  >
                    View / Download
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">No file</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {res.fileType}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
