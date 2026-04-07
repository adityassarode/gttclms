"use client";

import * as React from "react";
import {
  Users,
  UserX,
  Trash2,
  Search,
  Shield,
  Loader2,
  GraduationCap,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ApiId, User } from "@/lib/types";
import { getErrorMessage } from "@/lib/ui-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [isBanningId, setIsBanningId] = React.useState<ApiId | null>(null);
  const [isDeletingId, setIsDeletingId] = React.useState<ApiId | null>(null);
  const [isFaceLoadingId, setIsFaceLoadingId] = React.useState<ApiId | null>(
    null,
  );
  const [faceViewerOpen, setFaceViewerOpen] = React.useState(false);
  const [faceViewer, setFaceViewer] = React.useState<{
    userName: string;
    imageUrl: string;
  } | null>(null);

  const loadUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await api.getAdminUsers();
      setUsers(rows);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load users"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  React.useEffect(() => {
    return () => {
      if (faceViewer?.imageUrl) {
        URL.revokeObjectURL(faceViewer.imageUrl);
      }
    };
  }, [faceViewer]);

  const filteredUsers = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return users.filter((row) => {
      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        (row.registerNumber || "").toLowerCase().includes(q) ||
        (row.department || "").toLowerCase().includes(q);
      const matchesRole =
        roleFilter === "all" || row.role.toLowerCase() === roleFilter;
      const matchesStatus =
        statusFilter === "all" || row.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const stats = React.useMemo(
    () => ({
      total: users.length,
      students: users.filter((row) => row.role === "USER").length,
      admins: users.filter((row) => row.role === "ADMIN").length,
      banned: users.filter((row) => row.status === "BANNED").length,
    }),
    [users],
  );

  const handleBanUser = async (target: User) => {
    if (target.status === "BANNED") {
      return;
    }

    if (target.id === undefined || target.id === null) {
      toast.error("Unable to ban this user");
      return;
    }

    setIsBanningId(target.id);
    try {
      const updated = await api.banUser({
        id: target.id,
      });

      setUsers((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      toast.success("User has been banned");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to ban user"));
    } finally {
      setIsBanningId(null);
    }
  };

  const handleDeleteUser = async (target: User) => {
    setIsDeletingId(target.id);
    try {
      await api.deleteUser(target.id);
      setUsers((current) => current.filter((row) => row.id !== target.id));
      toast.success("User deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete user"));
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleViewFace = async (target: User) => {
    if (!target.faceImageAvailable) {
      toast.error("No face image available for this user");
      return;
    }

    setIsFaceLoadingId(target.id);
    try {
      const { blob } = await api.downloadFaceImageForAdmin(target.id);
      const objectUrl = URL.createObjectURL(blob);
      setFaceViewer((current) => {
        if (current?.imageUrl) {
          URL.revokeObjectURL(current.imageUrl);
        }
        return {
          userName: target.name,
          imageUrl: objectUrl,
        };
      });
      setFaceViewerOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load face image"));
    } finally {
      setIsFaceLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          User Management
        </h1>
        <p className="mt-1 text-muted-foreground">
          Search, review, and moderate user accounts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">All Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <GraduationCap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.students}</p>
                <p className="text-sm text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.admins}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.banned}</p>
                <p className="text-sm text-muted-foreground">Banned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, register number..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Students</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            {filteredUsers.length} matching users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Register No.
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Department
                  </TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Verification
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((row) => {
                  const isCurrentUser = row.id === currentUser?.id;
                  const canBan =
                    !isCurrentUser &&
                    row.role !== "ADMIN" &&
                    row.status !== "BANNED";
                  const canDelete = !isCurrentUser;

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">
                          {row.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.email}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge
                            variant={row.faceVerified ? "default" : "outline"}
                          >
                            Face {row.faceVerified ? "Verified" : "Pending"}
                          </Badge>
                          {row.faceImageAvailable ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewFace(row)}
                              disabled={isFaceLoadingId === row.id}
                              className="h-7 px-2 text-xs"
                            >
                              {isFaceLoadingId === row.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Eye className="mr-1 h-3 w-3" />
                              )}
                              View Face
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs">
                        {row.registerNumber || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {row.department || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.role === "ADMIN" ? "default" : "secondary"
                          }
                        >
                          {row.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            row.status === "BANNED"
                              ? "bg-red-500/10 text-red-600 border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          }
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={row.verified ? "default" : "outline"}>
                            Student {row.verified ? "Verified" : "Pending"}
                          </Badge>
                          <Badge
                            variant={row.faceVerified ? "default" : "outline"}
                          >
                            Face {row.faceVerified ? "Verified" : "Pending"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!canBan || isBanningId === row.id}
                              >
                                {isBanningId === row.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <UserX className="mr-2 h-4 w-4" />
                                )}
                                {row.status === "BANNED" ? "Banned" : "Ban"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Ban this user?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {row.name} will lose access to user actions
                                  after being banned.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => handleBanUser(row)}
                                >
                                  Ban User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                disabled={!canDelete || isDeletingId === row.id}
                              >
                                {isDeletingId === row.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete this user?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently removes {row.name} and cannot
                                  be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => handleDeleteUser(row)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Refreshing users...
            </p>
          ) : null}

          {!isLoading && filteredUsers.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No users match your filters.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={faceViewerOpen} onOpenChange={setFaceViewerOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Face Verification Image</DialogTitle>
            <DialogDescription>
              {faceViewer?.userName || "Selected user"}
            </DialogDescription>
          </DialogHeader>
          {faceViewer?.imageUrl ? (
            <img
              src={faceViewer.imageUrl}
              alt={`Face verification for ${faceViewer.userName}`}
              className="h-auto w-full rounded-lg border border-border/60 bg-black/5 object-contain"
            />
          ) : (
            <p className="text-sm text-muted-foreground">No image selected.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
