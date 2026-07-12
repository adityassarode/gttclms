"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Department } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DepartmentCard({ department }: { department: Department }) {
  return (
    <Link href={`/departments/${department.id}`} className="block h-full min-w-0 no-underline">
      <Card className="h-full min-w-0 transition-shadow hover:shadow-md">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          {department.logoUrl ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
              <Image src={department.logoUrl} alt={department.name} fill sizes="48px" className="object-cover" />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-lg font-semibold">
              {department.name?.charAt(0)}
            </div>
          )}
          <CardTitle className="min-w-0 break-words text-base leading-snug">{department.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="break-words text-sm text-muted-foreground line-clamp-3">{department.description || "No description provided."}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default DepartmentCard;
