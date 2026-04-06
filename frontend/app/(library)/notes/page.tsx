"use client";

import * as React from "react";
import { Search, Filter, BookMarked, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api, getUploadUrl } from "@/lib/api";
import { useProtectedPage } from "@/lib/route-guards";
import type { StudyNote } from "@/lib/types";
import { getErrorMessage, toIsoDate } from "@/lib/ui-helpers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function toPdfHref(path: string) {
  return getUploadUrl(path) || path;
}

export default function NotesPage() {
  const allowed = useProtectedPage();
  const [notes, setNotes] = React.useState<StudyNote[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [semester, setSemester] = React.useState("");
  const [academicYear, setAcademicYear] = React.useState("");
  const [unitNumber, setUnitNumber] = React.useState("");

  React.useEffect(() => {
    if (!allowed) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await api.getStudyNotes();
        if (!cancelled) {
          setNotes(rows);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Unable to load notes"));
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

  const filtered = React.useMemo(() => {
    const search = normalize(searchQuery);
    const departmentFilter = normalize(department);
    const semesterFilter = normalize(semester);
    const academicYearFilter = normalize(academicYear);
    const unitFilter = normalize(unitNumber);

    return notes.filter((note) => {
      const matchSearch =
        !search ||
        normalize(note.subjectName).includes(search) ||
        normalize(note.department).includes(search);

      const matchDepartment =
        !departmentFilter || normalize(note.department) === departmentFilter;
      const matchSemester =
        !semesterFilter || normalize(note.semester) === semesterFilter;
      const matchAcademicYear =
        !academicYearFilter ||
        normalize(note.academicYear) === academicYearFilter;

      const units = note.unitNumbers
        .split(",")
        .map((value) => normalize(value))
        .filter(Boolean);
      const matchUnit = !unitFilter || units.includes(unitFilter);

      return (
        matchSearch &&
        matchDepartment &&
        matchSemester &&
        matchAcademicYear &&
        matchUnit
      );
    });
  }, [notes, searchQuery, department, semester, academicYear, unitNumber]);

  if (!allowed) {
    return <div className="py-8" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Notes
        </h1>
        <p className="mt-1 text-muted-foreground">
          Browse notes by subject, semester, academic year, and unit
        </p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by subject or department"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Input
              placeholder="Department"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            />
            <Input
              placeholder="Semester"
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
            />
            <Input
              placeholder="Academic Year"
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
            />
            <Input
              placeholder="Unit Number"
              value={unitNumber}
              onChange={(event) => setUnitNumber(event.target.value)}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            {filtered.length} notes found
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookMarked className="h-5 w-5" />
            Available Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading notes...</p>
          ) : null}

          {!isLoading && filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notes matched your filters.
            </p>
          ) : null}

          {!isLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="px-3 py-3 text-left text-sm">Subject</th>
                    <th className="px-3 py-3 text-left text-sm">Department</th>
                    <th className="px-3 py-3 text-left text-sm">Semester</th>
                    <th className="px-3 py-3 text-left text-sm">
                      Academic Year
                    </th>
                    <th className="px-3 py-3 text-left text-sm">Units</th>
                    <th className="px-3 py-3 text-left text-sm">Uploaded</th>
                    <th className="px-3 py-3 text-right text-sm">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((note) => (
                    <tr key={note.id} className="border-b border-border/30">
                      <td className="px-3 py-3 text-sm font-medium text-foreground">
                        {note.subjectName}
                      </td>
                      <td className="px-3 py-3 text-sm">{note.department}</td>
                      <td className="px-3 py-3 text-sm">{note.semester}</td>
                      <td className="px-3 py-3 text-sm">{note.academicYear}</td>
                      <td className="px-3 py-3 text-sm">{note.unitNumbers}</td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {toIsoDate(note.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={toPdfHref(note.pdfUrl)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            Open
                          </a>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
