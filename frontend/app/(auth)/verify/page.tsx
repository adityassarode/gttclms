"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  CheckCircle2,
  User,
  GraduationCap,
  Calendar,
  Building,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useProtectedPage } from "@/lib/route-guards";
import { getErrorMessage } from "@/lib/ui-helpers";
import type { StudentResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const allowed = useProtectedPage({ redirectPath: "/verify" });
  const { user, refreshUser, isReady } = useAuth();

  const [registerNumber, setRegisterNumber] = React.useState(
    user?.registerNumber || "",
  );
  const [student, setStudent] = React.useState<StudentResponse | null>(null);
  const [form, setForm] = React.useState({
    name: user?.name || "",
    department: user?.department || "",
    semester: user?.semester || "",
    year: user?.year || "",
  });
  const [isLooking, setIsLooking] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);

  const redirectTo = searchParams.get("redirect") || "/";

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    if (user?.verified) {
      router.replace(redirectTo);
    }
  }, [isReady, redirectTo, router, user]);

  const handleLookup = async () => {
    if (!registerNumber.trim()) {
      toast.error("Please enter your register number");
      return;
    }

    setIsLooking(true);
    try {
      const result = await api.lookupStudent(
        registerNumber.trim().toUpperCase(),
      );
      setStudent(result);
      setForm({
        name: result.name,
        department: result.department,
        semester: result.semester,
        year: result.year,
      });
      toast.success("Student record found");
    } catch (error) {
      setStudent(null);
      toast.error(getErrorMessage(error, "Register number not found"));
    } finally {
      setIsLooking(false);
    }
  };

  const handleVerify = async () => {
    if (!registerNumber.trim()) {
      toast.error("Register number is required");
      return;
    }

    setIsVerifying(true);
    try {
      await api.verifyStudent({
        registerNumber: registerNumber.trim().toUpperCase(),
        name: form.name,
        department: form.department,
        semester: form.semester,
        year: form.year,
      });
      await refreshUser();
      toast.success("Verification successful");
      router.push(redirectTo);
    } catch (error) {
      toast.error(getErrorMessage(error, "Verification failed"));
    } finally {
      setIsVerifying(false);
    }
  };

  if (!allowed) {
    return <div className="py-8" />;
  }

  return (
    <Card className="w-full max-w-lg overflow-hidden border-border/50 shadow-xl shadow-primary/5">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <GraduationCap className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">
          Student Verification
        </CardTitle>
        <CardDescription>
          Verify your student details to unlock borrowing, reservations, and
          favorites.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="register">Register Number</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="register"
                value={registerNumber}
                onChange={(event) =>
                  setRegisterNumber(event.target.value.toUpperCase())
                }
                placeholder="e.g., 2024CS001"
                className="h-11 rounded-xl pl-10 uppercase"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleLookup();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleLookup}
              className="h-11 w-full rounded-xl px-6 sm:w-auto"
              disabled={isLooking}
            >
              {isLooking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Lookup"
              )}
            </Button>
          </div>
        </div>

        {student && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 rounded-xl bg-green-500/10 p-3 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm">
                Student record found. Confirm your details.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="department"
                    value={form.department}
                    onChange={(event) =>
                      setForm({ ...form, department: event.target.value })
                    }
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="semester"
                    value={form.semester}
                    onChange={(event) =>
                      setForm({ ...form, semester: event.target.value })
                    }
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="year"
                    value={form.year}
                    onChange={(event) =>
                      setForm({ ...form, year: event.target.value })
                    }
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleVerify}
              className="h-11 w-full rounded-xl font-medium"
              disabled={isVerifying}
            >
              {isVerifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm and Continue
              {!isVerifying && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        )}

        <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{user?.email}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <React.Suspense
      fallback={
        <Card className="w-full max-w-lg overflow-hidden border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
            <CardDescription>Preparing verification form</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <VerifyPageContent />
    </React.Suspense>
  );
}
