"use client";

import * as React from "react";
import Image from "next/image";
import {
  Search,
  Eye,
  Gift,
  Clock,
  CheckCircle,
  Filter,
  User,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api, getUploadUrl } from "@/lib/api";
import type { DonationRecord } from "@/lib/types";
import { getErrorMessage, toIsoDate } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function donationStatusLabel(createdAt: string) {
  const age = Date.now() - new Date(createdAt).getTime();
  const twoDays = 2 * 24 * 60 * 60 * 1000;
  return age <= twoDays ? "New" : "Archived";
}

export default function AdminDonationsPage() {
  const [donations, setDonations] = React.useState<DonationRecord[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedDonation, setSelectedDonation] =
    React.useState<DonationRecord | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await api.getAllDonations();
        if (!cancelled) {
          setDonations(rows);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Unable to load donations"));
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
  }, []);

  const filteredDonations = React.useMemo(() => {
    return donations.filter((donation) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        donation.title.toLowerCase().includes(searchLower) ||
        donation.author.toLowerCase().includes(searchLower) ||
        (donation.donorName || "").toLowerCase().includes(searchLower);
      const status = donationStatusLabel(donation.createdAt).toLowerCase();
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [donations, searchQuery, statusFilter]);

  const stats = React.useMemo(
    () => ({
      total: donations.length,
      new: donations.filter(
        (donation) => donationStatusLabel(donation.createdAt) === "New",
      ).length,
      archived: donations.filter(
        (donation) => donationStatusLabel(donation.createdAt) === "Archived",
      ).length,
      copies: donations.reduce((sum, donation) => sum + donation.copies, 0),
    }),
    [donations],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Donation Requests
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review and track book donations from users
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Donations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.new}</p>
                <p className="text-sm text-muted-foreground">New</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.archived}</p>
                <p className="text-sm text-muted-foreground">Archived</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Gift className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.copies}</p>
                <p className="text-sm text-muted-foreground">Total Copies</p>
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
                placeholder="Search by title, author, or donor..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-3 py-4 text-left text-sm font-medium text-muted-foreground sm:px-6">
                  Book
                </th>
                <th className="px-3 py-4 text-left text-sm font-medium text-muted-foreground sm:px-6">
                  Donor
                </th>
                <th className="px-3 py-4 text-left text-sm font-medium text-muted-foreground sm:px-6">
                  Date
                </th>
                <th className="px-3 py-4 text-left text-sm font-medium text-muted-foreground sm:px-6">
                  Status
                </th>
                <th className="px-3 py-4 text-right text-sm font-medium text-muted-foreground sm:px-6">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDonations.map((donation) => (
                <tr
                  key={donation.id}
                  className="border-b border-border/30 hover:bg-muted/20"
                >
                  <td className="px-3 py-4 sm:px-6">
                    <div>
                      <p className="font-medium text-foreground">
                        {donation.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {donation.author}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-4 sm:px-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {donation.donorName || "Anonymous"}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-muted-foreground sm:px-6">
                    {toIsoDate(donation.createdAt)}
                  </td>
                  <td className="px-3 py-4 sm:px-6">
                    {donationStatusLabel(donation.createdAt) === "New" ? (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        New
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Archived
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-4 text-right sm:px-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDonation(donation);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Donation Details</DialogTitle>
            <DialogDescription>
              Review submitted information and attached images
            </DialogDescription>
          </DialogHeader>

          {selectedDonation ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Title
                  </p>
                  <p className="text-foreground">{selectedDonation.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Author
                  </p>
                  <p className="text-foreground">{selectedDonation.author}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Donor
                  </p>
                  <p className="text-foreground">
                    {selectedDonation.donorName || "Anonymous"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Copies
                  </p>
                  <p className="text-foreground">{selectedDonation.copies}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Description
                </p>
                <p className="text-foreground">
                  {selectedDonation.description || "No description"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Attached Images
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[selectedDonation.image1, selectedDonation.image2]
                    .filter(Boolean)
                    .map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        className="relative h-36 overflow-hidden rounded-lg border border-border bg-muted"
                      >
                        <Image
                          src={getUploadUrl(image || null) || ""}
                          alt={`Donation image ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="300px"
                        />
                      </div>
                    ))}
                  {!selectedDonation.image1 && !selectedDonation.image2 ? (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground sm:col-span-2">
                      <ImageIcon className="mr-2 h-4 w-4" />
                      No images uploaded
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Refreshing donations...</p>
      ) : null}
    </div>
  );
}
