"use client";

import * as React from "react";
import { Search, Filter, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api, getUploadUrl } from "@/lib/api";
import { useProtectedPage } from "@/lib/route-guards";
import type { QuestionPaper } from "@/lib/types";
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

export default function QuestionPapersPage() {
  const allowed = useProtectedPage();
  const [papers, setPapers] = React.useState<QuestionPaper[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [semester, setSemester] = React.useState("");
  const [academicYear, setAcademicYear] = React.useState("");
  const [questionPaperYear, setQuestionPaperYear] = React.useState("");

  React.useEffect(() => {
    if (!allowed) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await api.getQuestionPapers();
        if (!cancelled) {
          setPapers(rows);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Unable to load question papers"));
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
    const paperYearFilter = normalize(questionPaperYear);

    return papers.filter((paper) => {
      const matchSearch =
        !search ||
        normalize(paper.subjectName).includes(search) ||
        normalize(paper.department).includes(search);
      const matchDepartment =
        !departmentFilter || normalize(paper.department) === departmentFilter;
      const matchSemester =
        !semesterFilter || normalize(paper.semester) === semesterFilter;
      const matchAcademicYear =
        !academicYearFilter ||
        normalize(paper.academicYear) === academicYearFilter;
      const matchPaperYear =
        !paperYearFilter ||
        normalize(paper.questionPaperYear) === paperYearFilter;

      return (
        matchSearch &&
        matchDepartment &&
        matchSemester &&
        matchAcademicYear &&
        matchPaperYear
      );
    });
  }, [
    papers,
    searchQuery,
    department,
    semester,
    academicYear,
    questionPaperYear,
  ]);

  if (!allowed) {
    return <div className="py-8" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Previous Year Question Papers
        </h1>
        <p className="mt-1 text-muted-foreground">
          Filter papers by subject, department, semester, and year
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
              placeholder="Paper Year"
              value={questionPaperYear}
              onChange={(event) => setQuestionPaperYear(event.target.value)}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            {filtered.length} papers found
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Available Papers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading question papers...
            </p>
          ) : null}

          {!isLoading && filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No papers matched your filters.
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
                    <th className="px-3 py-3 text-left text-sm">Paper Year</th>
                    <th className="px-3 py-3 text-left text-sm">Uploaded</th>
                    <th className="px-3 py-3 text-right text-sm">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((paper) => (
                    <tr key={paper.id} className="border-b border-border/30">
                      <td className="px-3 py-3 text-sm font-medium text-foreground">
                        {paper.subjectName}
                      </td>
                      <td className="px-3 py-3 text-sm">{paper.department}</td>
                      <td className="px-3 py-3 text-sm">{paper.semester}</td>
                      <td className="px-3 py-3 text-sm">
                        {paper.academicYear}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {paper.questionPaperYear}
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {toIsoDate(paper.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={toPdfHref(paper.pdfUrl)}
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
