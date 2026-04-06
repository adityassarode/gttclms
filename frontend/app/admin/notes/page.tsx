"use client";

import * as React from "react";
import {
  BookMarked,
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
import type { StudyNote } from "@/lib/types";
import { getErrorMessage, toIsoDate } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MAX_PDF_BYTES = 2 * 1024 * 1024;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function toPdfHref(path: string) {
  return getUploadUrl(path) || path;
}

export default function AdminNotesPage() {
  const [notes, setNotes] = React.useState<StudyNote[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<StudyNote | null>(
    null,
  );

  const [subjectName, setSubjectName] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [semester, setSemester] = React.useState("");
  const [academicYear, setAcademicYear] = React.useState("");
  const [unitNumbers, setUnitNumbers] = React.useState("");
  const [pdfUrl, setPdfUrl] = React.useState("");
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);

  const [editSubjectName, setEditSubjectName] = React.useState("");
  const [editDepartment, setEditDepartment] = React.useState("");
  const [editSemester, setEditSemester] = React.useState("");
  const [editAcademicYear, setEditAcademicYear] = React.useState("");
  const [editUnitNumbers, setEditUnitNumbers] = React.useState("");
  const [editPdfUrl, setEditPdfUrl] = React.useState("");
  const [editPdfFile, setEditPdfFile] = React.useState<File | null>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterDepartment, setFilterDepartment] = React.useState("");
  const [filterSemester, setFilterSemester] = React.useState("");
  const [filterAcademicYear, setFilterAcademicYear] = React.useState("");
  const [filterUnit, setFilterUnit] = React.useState("");

  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const editFileRef = React.useRef<HTMLInputElement | null>(null);

  const resetEditForm = React.useCallback(() => {
    setEditingId(null);
    setEditSubjectName("");
    setEditDepartment("");
    setEditSemester("");
    setEditAcademicYear("");
    setEditUnitNumbers("");
    setEditPdfUrl("");
    setEditPdfFile(null);
    if (editFileRef.current) {
      editFileRef.current.value = "";
    }
  }, []);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await api.getStudyNotes();
      setNotes(rows);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load notes"));
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
    const unitFilter = normalize(filterUnit);

    return notes.filter((note) => {
      const matchesSearch =
        !search ||
        normalize(note.subjectName).includes(search) ||
        normalize(note.department).includes(search);

      const matchesDepartment =
        !departmentFilter || normalize(note.department) === departmentFilter;
      const matchesSemester =
        !semesterFilter || normalize(note.semester) === semesterFilter;
      const matchesAcademicYear =
        !academicYearFilter ||
        normalize(note.academicYear) === academicYearFilter;

      const unitList = note.unitNumbers
        .split(",")
        .map((value) => normalize(value))
        .filter(Boolean);
      const matchesUnit = !unitFilter || unitList.includes(unitFilter);

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesSemester &&
        matchesAcademicYear &&
        matchesUnit
      );
    });
  }, [
    notes,
    searchQuery,
    filterDepartment,
    filterSemester,
    filterAcademicYear,
    filterUnit,
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !subjectName.trim() ||
      !department.trim() ||
      !semester.trim() ||
      !academicYear.trim() ||
      !unitNumbers.trim()
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
      const created = await api.createStudyNote({
        subjectName,
        department,
        semester,
        academicYear,
        unitNumbers,
        pdfUrl: pdfUrl.trim() || undefined,
        pdfFile: pdfFile || undefined,
      });

      setNotes((current) => [created, ...current]);
      setSubjectName("");
      setDepartment("");
      setSemester("");
      setAcademicYear("");
      setUnitNumbers("");
      setPdfUrl("");
      setPdfFile(null);
      if (fileRef.current) {
        fileRef.current.value = "";
      }

      toast.success("Note added");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add note"));
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (note: StudyNote) => {
    setEditingId(String(note.id));
    setEditSubjectName(note.subjectName);
    setEditDepartment(note.department);
    setEditSemester(note.semester);
    setEditAcademicYear(note.academicYear);
    setEditUnitNumbers(note.unitNumbers);
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
      !editUnitNumbers.trim()
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
      const updated = await api.updateStudyNote(editingId, {
        subjectName: editSubjectName,
        department: editDepartment,
        semester: editSemester,
        academicYear: editAcademicYear,
        unitNumbers: editUnitNumbers,
        pdfUrl: editPdfUrl.trim() || undefined,
        pdfFile: editPdfFile || undefined,
      });

      setNotes((current) =>
        current.map((note) =>
          String(note.id) === String(updated.id) ? updated : note,
        ),
      );
      resetEditForm();
      toast.success("Note updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update note"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) {
      return;
    }

    const id = String(deleteTarget.id);
    setDeletingId(id);
    try {
      await api.deleteStudyNote(deleteTarget.id);
      setNotes((current) => current.filter((item) => String(item.id) !== id));
      if (editingId === id) {
        resetEditForm();
      }
      setDeleteTarget(null);
      toast.success("Note deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete note"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Notes Repository
        </h1>
        <p className="mt-1 text-muted-foreground">
          Upload unit-wise notes for students with quick metadata filters
        </p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookMarked className="h-5 w-5" />
            Add Notes
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="unitNumbers">Unit Numbers *</Label>
                <Input
                  id="unitNumbers"
                  value={unitNumbers}
                  onChange={(event) => setUnitNumbers(event.target.value)}
                  placeholder="1,2,3"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter comma separated numeric units, for example: 1,2,3
                </p>
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
                  placeholder="https://example.com/notes.pdf"
                />
              </div>
              <div className="space-y-2">
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
              Add Notes
            </Button>
          </form>
        </CardContent>
      </Card>

      {editingId ? (
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pencil className="h-5 w-5" />
              Edit Note
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
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="editUnitNumbers">Unit Numbers *</Label>
                  <Input
                    id="editUnitNumbers"
                    value={editUnitNumbers}
                    onChange={(event) => setEditUnitNumbers(event.target.value)}
                    placeholder="1,2,3"
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
                    placeholder="https://example.com/notes.pdf"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="editPdfFile"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Replace PDF (max 2MB)
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
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Leave both replace fields empty to keep the current PDF.
              </p>

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
              placeholder="Unit Number"
              value={filterUnit}
              onChange={(event) => setFilterUnit(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            {filtered.length} notes found
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="px-3 py-3 text-left text-sm">Subject</th>
                  <th className="px-3 py-3 text-left text-sm">Department</th>
                  <th className="px-3 py-3 text-left text-sm">Semester</th>
                  <th className="px-3 py-3 text-left text-sm">Academic Year</th>
                  <th className="px-3 py-3 text-left text-sm">Units</th>
                  <th className="px-3 py-3 text-left text-sm">Added On</th>
                  <th className="px-3 py-3 text-right text-sm">Actions</th>
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
                      <div className="flex justify-end gap-2">
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
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(note)}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={deletingId === String(note.id)}
                          onClick={() => setDeleteTarget(note)}
                        >
                          {deletingId === String(note.id) ? (
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
            <p className="text-sm text-muted-foreground">No notes found.</p>
          ) : null}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading notes...</p>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget?.subjectName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              disabled={Boolean(deletingId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingId ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
