"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DepartmentCard({ department }: { department: any }) {
  return (
    <Link href={`/departments/${department.id}`} className="no-underline">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex items-center gap-3">
          {department.logoUrl ? (
            <div className="relative h-12 w-12 overflow-hidden rounded-md">
              <Image
                src={department.logoUrl}
                alt={department.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
              {department.name?.charAt(0)}
            </div>
          )}
          <CardTitle className="text-sm">{department.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {department.description || "No description provided."}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default DepartmentCard;
