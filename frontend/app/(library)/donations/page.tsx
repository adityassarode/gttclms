"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Gift, Heart, User, BookOpen, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api, getUploadUrl } from "@/lib/api";
import { useProtectedPage } from "@/lib/route-guards";
import type { DonationRecord } from "@/lib/types";
import { getErrorMessage, toIsoDate } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function DonationCard({ donation }: { donation: DonationRecord }) {
  const [loaded, setLoaded] = React.useState(false);
  const imageUrl = getUploadUrl(donation.image1 || donation.image2 || null);

  return (
    <Card className="overflow-hidden border-border/50 bg-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      {imageUrl ? (
        <div className="relative h-40 overflow-hidden bg-muted">
          {!loaded && <Skeleton className="absolute inset-0" />}
          <Image
            src={imageUrl}
            alt={donation.title}
            fill
            className="object-cover"
            onLoad={() => setLoaded(true)}
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <Badge
            variant="secondary"
            className="absolute right-3 top-3 bg-card/90"
          >
            {donation.copies} {donation.copies === 1 ? "copy" : "copies"}
          </Badge>
        </div>
      ) : null}
      <CardContent className="p-4">
        <h3 className="line-clamp-1 font-semibold text-foreground">
          {donation.title}
        </h3>
        <p className="text-sm text-muted-foreground">{donation.author}</p>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {donation.description || "No description"}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {donation.donorName || "Anonymous"}
          </span>
          <span className="text-xs text-muted-foreground">
            {toIsoDate(donation.createdAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DonationsPage() {
  const allowed = useProtectedPage({ redirectPath: "/donations" });

  const [communityDonations, setCommunityDonations] = React.useState<
    DonationRecord[]
  >([]);
  const [myDonations, setMyDonations] = React.useState<DonationRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!allowed) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [community, mine] = await Promise.all([
          api.getAllDonations(),
          api.getMyDonations(),
        ]);
        if (!cancelled) {
          setCommunityDonations(community);
          setMyDonations(mine);
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
  }, [allowed]);

  if (!allowed) {
    return <div className="py-8" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10">
            <Gift className="h-6 w-6 text-pink-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Book Donations
            </h1>
            <p className="text-muted-foreground">
              Community contributions and your donation history
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="community" className="space-y-6">
        <TabsList className="grid w-full max-w-full grid-cols-2 sm:max-w-md">
          <TabsTrigger value="community" className="gap-2">
            <Heart className="h-4 w-4" />
            Community
          </TabsTrigger>
          <TabsTrigger value="mine" className="gap-2">
            <Gift className="h-4 w-4" />
            My Donations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="community" className="space-y-6">
          <div className="flex items-center gap-3 rounded-xl bg-pink-500/10 p-4 text-sm">
            <Heart className="h-5 w-5 text-pink-500" />
            <p className="text-pink-800 dark:text-pink-200">
              Thanks to every donor helping expand our library collection.
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="border-border/50 bg-card">
                  <CardContent className="space-y-3 p-4">
                    <Skeleton className="h-40 w-full rounded-lg" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : communityDonations.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {communityDonations.map((donation) => (
                <DonationCard key={donation.id} donation={donation} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-card p-6 text-center text-muted-foreground">
              No donations available yet.
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-6">
          {myDonations.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myDonations.map((donation) => (
                <DonationCard key={donation.id} donation={donation} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                No donations yet
              </h2>
              <p className="mt-1 max-w-sm text-muted-foreground">
                You have not donated any books yet.
              </p>
              <Button className="mt-6 rounded-xl" asChild>
                <Link href="/donate">
                  Donate a Book
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
