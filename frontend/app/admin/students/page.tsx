"use client";

import * as React from "react";
import {
  GraduationCap,
  Plus,
  Upload,
  Search,
  Loader2,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { getErrorMessage } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface StudentForm {
  registerNumber: string;
  name: string;
  department: string;
  semester: string;
  year: string;
}

const initialForm: StudentForm = {
  registerNumber: "",
  name: "",
  department: "",
  semester: "",
  year: "",
};

export default function AdminStudentsPage() {
  const [students, setStudents] = React.useState<User[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [uploadResults, setUploadResults] = React.useState<string[]>([]);
  const [form, setForm] = React.useState<StudentForm>(initialForm);

  const loadStudents = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const users = await api.getAdminUsers();
      setStudents(users.filter((user) => user.role === "USER"));
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load students"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = React.useMemo(() => {
    return students.filter((student) => {
      const q = searchQuery.toLowerCase();
      return (
        (student.name || "").toLowerCase().includes(q) ||
        (student.registerNumber || "").toLowerCase().includes(q) ||
        (student.department || "").toLowerCase().includes(q) ||
        (student.email || "").toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery]);

  const handleAddStudent = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !form.registerNumber ||
      !form.name ||
      !form.department ||
      !form.semester ||
      !form.year
    ) {
      toast.error("All fields are required");
      return;
    }

    setIsAdding(true);
    try {
      await api.addStudent(form);
      toast.success("Student added");
      setForm(initialForm);
      setIsAddDialogOpen(false);
      await loadStudents();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add student"));
    } finally {
      setIsAdding(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const imported = (await api.uploadStudents(file)) as Array<{
        registerNumber: string;
        name: string;
      }>;
      setUploadResults(
        imported
          .slice(0, 6)
          .map((item) => `${item.registerNumber} - ${item.name}`),
      );
      toast.success(`Uploaded ${imported.length} student records`);
      await loadStudents();
    } catch (error) {
      setUploadResults([]);
      toast.error(getErrorMessage(error, "Unable to process file"));
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleRemoveStudent = async (student: User) => {
    try {
      await api.deleteUser(student.id);
      setStudents((current) =>
        current.filter((item) => item.id !== student.id),
      );
      toast.success("Student removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove student"));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
            <GraduationCap className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Student Management
            </h1>
            <p className="text-muted-foreground">
              Add students and maintain verification records
            </p>
          </div>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>
                Student records can be verified by users during onboarding.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="registerNumber">Register Number</Label>
                <Input
                  id="registerNumber"
                  value={form.registerNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      registerNumber: event.target.value.toUpperCase(),
                    })
                  }
                  className="uppercase"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(event) =>
                    setForm({ ...form, department: event.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Input
                    id="semester"
                    value={form.semester}
                    onChange={(event) =>
                      setForm({ ...form, semester: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    value={form.year}
                    onChange={(event) =>
                      setForm({ ...form, year: event.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdding}>
                  {isAdding ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Add Student
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5 text-muted-foreground" />
            Bulk Upload
          </CardTitle>
          <CardDescription>
            Upload `.xlsx` file with columns: registerNumber, name, department,
            semester, year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-6 hover:border-primary/50">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {isUploading
                  ? "Processing file..."
                  : "Click to upload Excel file"}
              </span>
              <Input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>

            {uploadResults.length > 0 && (
              <div className="w-full rounded-xl bg-green-500/10 p-4 sm:max-w-[360px]">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Uploaded Records
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {uploadResults.map((result) => (
                    <li key={result}>{result}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Student Records</CardTitle>
              <CardDescription>
                {filteredStudents.length} users found
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border/60">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Register No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Department
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Semester
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono text-sm">
                      {student.registerNumber || "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.name || student.email}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {student.department || "-"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {student.semester || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={student.verified ? "default" : "secondary"}
                      >
                        {student.verified ? "Verified" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove this user?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes{" "}
                              {student.name || student.email} from the system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleRemoveStudent(student)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Refreshing students...
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
