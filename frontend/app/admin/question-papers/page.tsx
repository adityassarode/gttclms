"use client";

import * as React from "react";
import {
  FileText,
  Search,
  Upload,
  Link2,
  ExternalLink,
  Filter,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, getUploadUrl } from "@/lib/api";
import type { QuestionPaper } from "@/lib/types";
import { getErrorMessage, toIsoDate } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_PDF_BYTES = 2 * 1024 * 1024;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function toPdfHref(path: string) {
  return getUploadUrl(path) || path;
}

export default function AdminQuestionPapersPage() {
  const [papers, setPapers] = React.useState<QuestionPaper[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [subjectName, setSubjectName] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [semester, setSemester] = React.useState("");
  const [academicYear, setAcademicYear] = React.useState("");
  const [questionPaperYear, setQuestionPaperYear] = React.useState("");
  const [pdfUrl, setPdfUrl] = React.useState("");
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);

  const [editSubjectName, setEditSubjectName] = React.useState("");
  const [editDepartment, setEditDepartment] = React.useState("");
  const [editSemester, setEditSemester] = React.useState("");
  const [editAcademicYear, setEditAcademicYear] = React.useState("");
  const [editQuestionPaperYear, setEditQuestionPaperYear] = React.useState("");
  const [editPdfUrl, setEditPdfUrl] = React.useState("");
  const [editPdfFile, setEditPdfFile] = React.useState<File | null>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterDepartment, setFilterDepartment] = React.useState("");
  const [filterSemester, setFilterSemester] = React.useState("");
  const [filterAcademicYear, setFilterAcademicYear] = React.useState("");
  const [filterQuestionYear, setFilterQuestionYear] = React.useState("");

  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const editFileRef = React.useRef<HTMLInputElement | null>(null);

  const resetEditForm = React.useCallback(() => {
    setEditingId(null);
    setEditSubjectName("");
    setEditDepartment("");
    setEditSemester("");
    setEditAcademicYear("");
    setEditQuestionPaperYear("");
    setEditPdfUrl("");
    setEditPdfFile(null);
    if (editFileRef.current) {
      editFileRef.current.value = "";
    }
  }, []);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await api.getQuestionPapers();
      setPapers(rows);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load question papers"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const search = normalize(searchQuery);
    const departmentFilter = normalize(filterDepartment);
    const semesterFilter = normalize(filterSemester);
    const academicYearFilter = normalize(filterAcademicYear);
    const questionYearFilter = normalize(filterQuestionYear);

    return papers.filter((paper) => {
      const matchesSearch =
        !search ||
        normalize(paper.subjectName).includes(search) ||
        normalize(paper.department).includes(search);

      const matchesDepartment =
        !departmentFilter || normalize(paper.department) === departmentFilter;
      const matchesSemester =
        !semesterFilter || normalize(paper.semester) === semesterFilter;
      const matchesAcademicYear =
        !academicYearFilter ||
        normalize(paper.academicYear) === academicYearFilter;
      const matchesQuestionYear =
        !questionYearFilter ||
        normalize(paper.questionPaperYear) === questionYearFilter;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesSemester &&
        matchesAcademicYear &&
        matchesQuestionYear
      );
    });
  }, [
    papers,
    searchQuery,
    filterDepartment,
    filterSemester,
    filterAcademicYear,
    filterQuestionYear,
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !subjectName.trim() ||
      !department.trim() ||
      !semester.trim() ||
      !academicYear.trim() ||
      !questionPaperYear.trim()
    ) {
      toast.error("Fill all required fields");
      return;
    }

    if (!pdfFile && !pdfUrl.trim()) {
      toast.error("Upload a PDF or provide a PDF link");
      return;
    }

    if (pdfFile && pdfFile.size > MAX_PDF_BYTES) {
      toast.error("PDF size must be 2MB or less");
      return;
    }

    setIsSaving(true);
    try {
      const created = await api.createQuestionPaper({
        subjectName,
        department,
        semester,
        academicYear,
        questionPaperYear,
        pdfUrl: pdfUrl.trim() || undefined,
        pdfFile: pdfFile || undefined,
      });

      setPapers((current) => [created, ...current]);
      setSubjectName("");
      setDepartment("");
      setSemester("");
      setAcademicYear("");
      setQuestionPaperYear("");
      setPdfUrl("");
      setPdfFile(null);
      if (fileRef.current) {
        fileRef.current.value = "";
      }

      toast.success("Question paper added");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add question paper"));
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (paper: QuestionPaper) => {
    setEditingId(String(paper.id));
    setEditSubjectName(paper.subjectName);
    setEditDepartment(paper.department);
    setEditSemester(paper.semester);
    setEditAcademicYear(paper.academicYear);
    setEditQuestionPaperYear(paper.questionPaperYear);
    setEditPdfUrl("");
    setEditPdfFile(null);
    if (editFileRef.current) {
      editFileRef.current.value = "";
    }
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingId) {
      return;
    }

    if (
      !editSubjectName.trim() ||
      !editDepartment.trim() ||
      !editSemester.trim() ||
      !editAcademicYear.trim() ||
      !editQuestionPaperYear.trim()
    ) {
      toast.error("Fill all required fields");
      return;
    }

    if (editPdfFile && editPdfFile.size > MAX_PDF_BYTES) {
      toast.error("PDF size must be 2MB or less");
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await api.updateQuestionPaper(editingId, {
        subjectName: editSubjectName,
        department: editDepartment,
        semester: editSemester,
        academicYear: editAcademicYear,
        questionPaperYear: editQuestionPaperYear,
        pdfUrl: editPdfUrl.trim() || undefined,
        pdfFile: editPdfFile || undefined,
      });

      setPapers((current) =>
        current.map((paper) =>
          String(paper.id) === String(updated.id) ? updated : paper,
        ),
      );
      resetEditForm();
      toast.success("Question paper updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update question paper"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (paper: QuestionPaper) => {
    if (
      !window.confirm(
        `Delete question paper \"${paper.subjectName}\" (${paper.questionPaperYear})?`,
      )
    ) {
      return;
    }

    const id = String(paper.id);
    setDeletingId(id);
    try {
      await api.deleteQuestionPaper(paper.id);
      setPapers((current) => current.filter((item) => String(item.id) !== id));
      if (editingId === id) {
        resetEditForm();
      }
      toast.success("Question paper deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete question paper"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Previous Year Question Papers
        </h1>
        <p className="mt-1 text-muted-foreground">
          Add and manage department-wise previous year papers
        </p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Add Question Paper
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subjectName">Subject Name *</Label>
                <Input
                  id="subjectName"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Semester *</Label>
                <Input
                  id="semester"
                  value={semester}
                  onChange={(event) => setSemester(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Input
                  id="academicYear"
                  value={academicYear}
                  onChange={(event) => setAcademicYear(event.target.value)}
                  placeholder="2025-2026"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="questionPaperYear">Question Paper Year *</Label>
                <Input
                  id="questionPaperYear"
                  value={questionPaperYear}
                  onChange={(event) => setQuestionPaperYear(event.target.value)}
                  placeholder="2024"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pdfUrl" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  PDF Link
                </Label>
                <Input
                  id="pdfUrl"
                  value={pdfUrl}
                  onChange={(event) => setPdfUrl(event.target.value)}
                  placeholder="https://example.com/paper.pdf"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pdfFile" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload PDF (max 2MB)
                </Label>
                <Input
                  id="pdfFile"
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) =>
                    setPdfFile(event.target.files?.[0] || null)
                  }
                />
              </div>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add Question Paper
            </Button>
          </form>
        </CardContent>
      </Card>

      {editingId ? (
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pencil className="h-5 w-5" />
              Edit Question Paper
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editSubjectName">Subject Name *</Label>
                  <Input
                    id="editSubjectName"
                    value={editSubjectName}
                    onChange={(event) => setEditSubjectName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDepartment">Department *</Label>
                  <Input
                    id="editDepartment"
                    value={editDepartment}
                    onChange={(event) => setEditDepartment(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editSemester">Semester *</Label>
                  <Input
                    id="editSemester"
                    value={editSemester}
                    onChange={(event) => setEditSemester(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAcademicYear">Academic Year *</Label>
                  <Input
                    id="editAcademicYear"
                    value={editAcademicYear}
                    onChange={(event) =>
                      setEditAcademicYear(event.target.value)
                    }
                    placeholder="2025-2026"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editQuestionPaperYear">
                    Question Paper Year *
                  </Label>
                  <Input
                    id="editQuestionPaperYear"
                    value={editQuestionPaperYear}
                    onChange={(event) =>
                      setEditQuestionPaperYear(event.target.value)
                    }
                    placeholder="2024"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="editPdfUrl"
                    className="flex items-center gap-2"
                  >
                    <Link2 className="h-4 w-4" />
                    Replace PDF Link
                  </Label>
                  <Input
                    id="editPdfUrl"
                    value={editPdfUrl}
                    onChange={(event) => setEditPdfUrl(event.target.value)}
                    placeholder="https://example.com/paper.pdf"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="editPdfFile"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Replace PDF File (max 2MB)
                  </Label>
                  <Input
                    id="editPdfFile"
                    ref={editFileRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) =>
                      setEditPdfFile(event.target.files?.[0] || null)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave both replace fields empty to keep the current PDF.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={resetEditForm}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/50">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search subject or department"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Input
              placeholder="Department"
              value={filterDepartment}
              onChange={(event) => setFilterDepartment(event.target.value)}
            />
            <Input
              placeholder="Semester"
              value={filterSemester}
              onChange={(event) => setFilterSemester(event.target.value)}
            />
            <Input
              placeholder="Academic Year"
              value={filterAcademicYear}
              onChange={(event) => setFilterAcademicYear(event.target.value)}
            />
            <Input
              placeholder="Paper Year"
              value={filterQuestionYear}
              onChange={(event) => setFilterQuestionYear(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            {filtered.length} question papers found
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="px-3 py-3 text-left text-sm">Subject</th>
                  <th className="px-3 py-3 text-left text-sm">Department</th>
                  <th className="px-3 py-3 text-left text-sm">Semester</th>
                  <th className="px-3 py-3 text-left text-sm">Academic Year</th>
                  <th className="px-3 py-3 text-left text-sm">Paper Year</th>
                  <th className="px-3 py-3 text-left text-sm">Added On</th>
                  <th className="px-3 py-3 text-right text-sm">Actions</th>
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
                    <td className="px-3 py-3 text-sm">{paper.academicYear}</td>
                    <td className="px-3 py-3 text-sm">
                      {paper.questionPaperYear}
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">
                      {toIsoDate(paper.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
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
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(paper)}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={deletingId === String(paper.id)}
                          onClick={() => handleDelete(paper)}
                        >
                          {deletingId === String(paper.id) ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No question papers found.
            </p>
          ) : null}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading question papers...
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
