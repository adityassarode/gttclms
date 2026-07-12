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

type SpreadsheetCell = {
  value: string;
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean;
};

type SpreadsheetPreview = {
  cells: SpreadsheetCell[][];
  columnWidths: number[];
};

type SpreadsheetRange = {
  s: { r: number; c: number };
  e: { r: number; c: number };
};

type SpreadsheetWorksheet = Record<string, unknown> & {
  "!ref"?: string;
  "!merges"?: SpreadsheetRange[];
  "!cols"?: Array<{ wch?: number; width?: number }>;
};

type SpreadsheetUtils = {
  utils: {
    decode_range: (range: string) => SpreadsheetRange;
    encode_cell: (cell: { r: number; c: number }) => string;
  };
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

function getSpreadsheetCellText(cell: unknown) {
  if (!cell || typeof cell !== "object") return "";
  const spreadsheetCell = cell as { w?: unknown; v?: unknown };
  const value = spreadsheetCell.w ?? spreadsheetCell.v;
  return value === undefined || value === null ? "" : String(value);
}

function buildSpreadsheetGrid(worksheet: SpreadsheetWorksheet, XLSX: SpreadsheetUtils): SpreadsheetPreview {
  const rangeRef = worksheet["!ref"];
  if (!rangeRef) {
    return { cells: [], columnWidths: [] };
  }

  const range = XLSX.utils.decode_range(rangeRef);
  const maxRows = Math.min(range.e.r - range.s.r + 1, 200);
  const maxColumns = Math.min(range.e.c - range.s.c + 1, 60);
  const cells: SpreadsheetCell[][] = Array.from({ length: maxRows }, () =>
    Array.from({ length: maxColumns }, () => ({ value: "" })),
  );

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < maxColumns; columnIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: range.s.r + rowIndex, c: range.s.c + columnIndex });
      cells[rowIndex][columnIndex] = { value: getSpreadsheetCellText(worksheet[address]) };
    }
  }

  const merges = worksheet["!merges"] || [];
  merges.forEach((merge) => {
    const startRow = merge.s.r - range.s.r;
    const startColumn = merge.s.c - range.s.c;
    const endRow = Math.min(merge.e.r - range.s.r, maxRows - 1);
    const endColumn = Math.min(merge.e.c - range.s.c, maxColumns - 1);

    if (startRow < 0 || startColumn < 0 || startRow >= maxRows || startColumn >= maxColumns) {
      return;
    }

    cells[startRow][startColumn] = {
      ...cells[startRow][startColumn],
      rowSpan: endRow - startRow + 1,
      colSpan: endColumn - startColumn + 1,
    };

    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
      for (let columnIndex = startColumn; columnIndex <= endColumn; columnIndex += 1) {
        if (rowIndex !== startRow || columnIndex !== startColumn) {
          cells[rowIndex][columnIndex] = { ...cells[rowIndex][columnIndex], hidden: true };
        }
      }
    }
  });

  const worksheetColumns = worksheet["!cols"] || [];
  const columnWidths = Array.from({ length: maxColumns }, (_, index) => {
    const configuredWidth = worksheetColumns[range.s.c + index]?.wch ?? worksheetColumns[range.s.c + index]?.width;
    return Math.max(72, Math.min(220, Math.round((configuredWidth || 12) * 8)));
  });

  return { cells, columnWidths };
}

async function loadSpreadsheet(fileUrl: string): Promise<SpreadsheetPreview> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error("Unable to load spreadsheet preview");
  }

  const buffer = await response.arrayBuffer();
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, cellNF: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { cells: [], columnWidths: [] };
  }

  return buildSpreadsheetGrid(workbook.Sheets[firstSheetName] as SpreadsheetWorksheet, XLSX as SpreadsheetUtils);
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
    <div className="max-h-[70vh] overflow-auto rounded-md border bg-white">
      <table className="border-collapse text-sm text-slate-950">
        {data.columnWidths.length > 0 ? (
          <colgroup>
            {data.columnWidths.map((width, index) => (
              <col key={index} style={{ width, minWidth: width }} />
            ))}
          </colgroup>
        ) : null}
        <tbody>
          {data.cells.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-muted-foreground">No rows found in this spreadsheet.</td>
            </tr>
          ) : (
            data.cells.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) =>
                  cell.hidden ? null : (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      rowSpan={cell.rowSpan}
                      colSpan={cell.colSpan}
                      className="h-8 whitespace-pre-wrap border border-slate-300 px-2 py-1 text-center align-middle leading-tight"
                    >
                      {cell.value}
                    </td>
                  ),
                )}
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
