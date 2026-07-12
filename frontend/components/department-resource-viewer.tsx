"use client";

import * as React from "react";
import { Download, Eye, FileText, Loader2 } from "lucide-react";
import type { DepartmentResource } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OFFICE_EXTENSIONS = ["doc", "docx", "ppt", "pptx"];
const SPREADSHEET_EXTENSIONS = ["csv", "xls", "xlsx"];
const TEXT_EXTENSIONS = ["txt", "md", "json", "xml", "html", "css", "js", "ts"];

type SpreadsheetPreview = {
  columns: string[];
  rows: string[][];
};

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "spreadsheet"; data: SpreadsheetPreview }
  | { status: "text"; text: string };

function getExtension(resource: DepartmentResource) {
  const source = `${resource.fileUrl || ""} ${resource.title || ""}`.toLowerCase();
  const match = source.match(/\.([a-z0-9]+)(?:[?#]|\s|$)/);
  return match?.[1] || "";
}

function getAbsoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

function getOfficeViewerUrl(fileUrl: string) {
  const absoluteUrl = getAbsoluteUrl(fileUrl);
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
}

function isSpreadsheet(resource: DepartmentResource) {
  const extension = getExtension(resource);
  const fileType = (resource.fileType || "").toLowerCase();
  return (
    SPREADSHEET_EXTENSIONS.includes(extension) ||
    fileType.includes("spreadsheet") ||
    fileType.includes("excel") ||
    fileType.includes("csv")
  );
}

function isText(resource: DepartmentResource) {
  const extension = getExtension(resource);
  const fileType = (resource.fileType || "").toLowerCase();
  return TEXT_EXTENSIONS.includes(extension) || fileType.startsWith("text/");
}

function isImage(resource: DepartmentResource) {
  return (resource.fileType || "").toLowerCase().startsWith("image/");
}

function isPdf(resource: DepartmentResource) {
  return getExtension(resource) === "pdf" || (resource.fileType || "").toLowerCase().includes("pdf");
}

function isOfficeDocument(resource: DepartmentResource) {
  const extension = getExtension(resource);
  return OFFICE_EXTENSIONS.includes(extension);
}

function normalizeSpreadsheetRows(rows: unknown[][]): SpreadsheetPreview {
  const [headerRow, ...bodyRows] = rows;
  const maxColumns = Math.max(
    headerRow?.length || 0,
    ...bodyRows.map((row) => row.length),
    1,
  );
  const columns = Array.from({ length: maxColumns }, (_, index) => {
    const value = headerRow?.[index];
    return value === undefined || value === null || String(value).trim() === ""
      ? `Column ${index + 1}`
      : String(value);
  });
  const normalizedRows = bodyRows.slice(0, 200).map((row) =>
    Array.from({ length: maxColumns }, (_, index) => {
      const value = row[index];
      return value === undefined || value === null ? "" : String(value);
    }),
  );

  return { columns, rows: normalizedRows };
}

async function loadSpreadsheet(fileUrl: string): Promise<SpreadsheetPreview> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error("Unable to load spreadsheet preview");
  }

  const buffer = await response.arrayBuffer();
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { columns: ["Column 1"], rows: [] };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  return normalizeSpreadsheetRows(rows as unknown[][]);
}

async function loadText(fileUrl: string) {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error("Unable to load text preview");
  }
  return response.text();
}

function SpreadsheetTable({ data }: { data: SpreadsheetPreview }) {
  return (
    <div className="max-h-[60vh] overflow-auto rounded-md border">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr>
            {data.columns.map((column, index) => (
              <th key={`${column}-${index}`} className="border-b px-3 py-2 text-left font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <tr>
              <td colSpan={data.columns.length} className="px-3 py-6 text-center text-muted-foreground">
                No rows found in this spreadsheet.
              </td>
            </tr>
          ) : (
            data.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-muted/30">
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="max-w-80 break-words border-t px-3 py-2 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DepartmentResourceActions({ resource }: { resource: DepartmentResource }) {
  const [open, setOpen] = React.useState(false);
  const [preview, setPreview] = React.useState<PreviewState>({ status: "idle" });

  const fileUrl = resource.fileUrl || "";

  React.useEffect(() => {
    if (!open || !fileUrl) return;

    let cancelled = false;

    async function loadPreview() {
      if (isSpreadsheet(resource)) {
        setPreview({ status: "loading" });
        try {
          const data = await loadSpreadsheet(fileUrl);
          if (!cancelled) setPreview({ status: "spreadsheet", data });
        } catch (error) {
          if (!cancelled) {
            setPreview({
              status: "error",
              message: error instanceof Error ? error.message : "Unable to load spreadsheet preview",
            });
          }
        }
        return;
      }

      if (isText(resource)) {
        setPreview({ status: "loading" });
        try {
          const text = await loadText(fileUrl);
          if (!cancelled) setPreview({ status: "text", text });
        } catch (error) {
          if (!cancelled) {
            setPreview({
              status: "error",
              message: error instanceof Error ? error.message : "Unable to load text preview",
            });
          }
        }
        return;
      }

      setPreview({ status: "idle" });
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, open, resource]);

  if (!fileUrl) {
    return <span className="text-sm text-muted-foreground">No file</span>;
  }

  return (
    <>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Eye className="mr-2 h-4 w-4" /> View
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={fileUrl} download target="_blank" rel="noreferrer">
            <Download className="mr-2 h-4 w-4" /> Download
          </a>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="break-words pr-8">{resource.title || "File preview"}</DialogTitle>
            <DialogDescription className="break-words">
              {resource.folder || "General"} · {resource.fileType || getExtension(resource).toUpperCase() || "File"}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-[50vh] overflow-auto">
            {preview.status === "loading" ? (
              <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading preview...
              </div>
            ) : null}

            {preview.status === "error" ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {preview.message}. Use Download to open the original file.
              </div>
            ) : null}

            {preview.status === "spreadsheet" ? <SpreadsheetTable data={preview.data} /> : null}

            {preview.status === "text" ? (
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">
                {preview.text}
              </pre>
            ) : null}

            {preview.status === "idle" && isImage(resource) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl} alt={resource.title || "Uploaded file"} className="mx-auto max-h-[70vh] max-w-full rounded-md object-contain" />
            ) : null}

            {preview.status === "idle" && isPdf(resource) ? (
              <iframe src={fileUrl} title={resource.title || "PDF preview"} className="h-[70vh] w-full rounded-md border" />
            ) : null}

            {preview.status === "idle" && isOfficeDocument(resource) ? (
              <iframe src={getOfficeViewerUrl(fileUrl)} title={resource.title || "Office document preview"} className="h-[70vh] w-full rounded-md border" />
            ) : null}

            {preview.status === "idle" && !isImage(resource) && !isPdf(resource) && !isOfficeDocument(resource) ? (
              <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-md border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                <FileText className="mb-3 h-10 w-10" />
                Preview is not available for this file type. Use Download to open the original file.
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
