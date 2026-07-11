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

  React.useEffect(() => {
    setLoading(true);
    void api
      .getDepartments()
      .then((result) => setDepartments(result || []))
      .catch(() => setDepartments([]))
      .finally(() => setLoading(false));
  }, []);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.searchDepartments(query.trim());
      // map to departments overview
      const unique = new Map<string, Department>();
      (res || []).forEach((r) =>
        unique.set(String(r.department.id), r.department),
      );
      setDepartments(Array.from(unique.values()));
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-4 text-2xl font-semibold">Departments</h1>

      <form onSubmit={onSearch} className="mb-6 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search department content..."
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>

      {loading ? <p>Loading...</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {departments.map((d) => (
          <DepartmentCard key={d.id} department={d} />
        ))}
      </div>
    </div>
  );
}
