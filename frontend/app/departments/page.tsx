"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { Department } from "@/lib/types";
import DepartmentCard from "@/components/department-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DepartmentsPage() {
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const loadDepartments = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getDepartments();
      setDepartments(result || []);
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      void loadDepartments();
      return;
    }
    setLoading(true);
    try {
      const res = await api.searchDepartments(query.trim());
      const unique = new Map<string, Department>();
      (res || []).forEach((r) => unique.set(String(r.department.id), r.department));
      setDepartments(Array.from(unique.values()));
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 min-w-0 space-y-2">
        <h1 className="break-words text-2xl font-semibold sm:text-3xl">Departments</h1>
        <p className="max-w-3xl break-words text-sm text-muted-foreground sm:text-base">
          Browse department resources, notes, files, and learning material from the main website.
        </p>
      </div>

      <form onSubmit={onSearch} className="mb-6 flex flex-col gap-2 sm:flex-row">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search department content..." className="min-w-0 flex-1" />
        <Button type="submit" className="w-full sm:w-auto">Search</Button>
      </form>

      {loading ? <p className="text-sm text-muted-foreground">Loading departments...</p> : null}
      {!loading && departments.length === 0 ? <p className="text-sm text-muted-foreground">No departments found.</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {departments.map((d) => <DepartmentCard key={d.id} department={d} />)}
      </div>
    </main>
  );
}
