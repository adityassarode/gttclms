"use client";

import * as React from "react";
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  Download,
  Mail,
  RefreshCw,
  Link2,
  Loader2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useProtectedPage } from "@/lib/route-guards";
import type { DataAnalysisStoredFile } from "@/lib/types";
import { getErrorMessage, toIsoDate } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CHART_COLORS = [
  "#0f766e",
  "#1d4ed8",
  "#9333ea",
  "#ea580c",
  "#16a34a",
  "#dc2626",
  "#db2777",
  "#0891b2",
];
const MAX_DATASET_BYTES = 50 * 1024 * 1024;

type DataRow = Record<string, unknown>;
type ColumnType = "number" | "boolean" | "date" | "string" | "mixed" | "empty";
type MissingStrategy =
  | "none"
  | "drop-rows"
  | "fill-numeric-mean"
  | "fill-empty-string";

type QuickGraph = {
  key: string;
  title: string;
  kind: "line" | "bar";
  data: Array<{ label: string; value: number }>;
  color: string;
};

function stripExtension(name: string) {
  const dot = name.lastIndexOf(".");
  if (dot > 0) {
    return name.slice(0, dot);
  }
  return name;
}

function isMissing(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function detectValueType(
  value: unknown,
): Exclude<ColumnType, "mixed" | "empty"> {
  if (typeof value === "boolean") {
    return "boolean";
  }

  const numeric = toNumber(value);
  if (numeric !== null) {
    return "number";
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "false") {
      return "boolean";
    }

    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) {
      return "date";
    }

    return "string";
  }

  return "string";
}

function getColumns(rows: DataRow[]) {
  const ordered: string[] = [];
  const seen = new Set<string>();

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    });
  });

  return ordered;
}

function getColumnTypes(rows: DataRow[], columns: string[]) {
  const result: Record<string, ColumnType> = {};

  columns.forEach((column) => {
    const foundTypes = new Set<Exclude<ColumnType, "mixed" | "empty">>();

    for (const row of rows) {
      const value = row[column];
      if (isMissing(value)) {
        continue;
      }
      foundTypes.add(detectValueType(value));
      if (foundTypes.size > 1) {
        break;
      }
    }

    if (foundTypes.size === 0) {
      result[column] = "empty";
    } else if (foundTypes.size === 1) {
      result[column] = [...foundTypes][0];
    } else {
      result[column] = "mixed";
    }
  });

  return result;
}

function getMissingByColumn(rows: DataRow[], columns: string[]) {
  return columns.map((column) => {
    const missing = rows.reduce(
      (count, row) => (isMissing(row[column]) ? count + 1 : count),
      0,
    );
    return { column, missing };
  });
}

function getDuplicateCount(rows: DataRow[]) {
  const seen = new Set<string>();
  let duplicates = 0;

  for (const row of rows) {
    const signature = JSON.stringify(row);
    if (seen.has(signature)) {
      duplicates += 1;
    } else {
      seen.add(signature);
    }
  }

  return duplicates;
}

function getNumericStats(rows: DataRow[], columns: string[]) {
  return columns
    .map((column) => {
      const values = rows
        .map((row) => toNumber(row[column]))
        .filter((value): value is number => value !== null);

      if (!values.length) {
        return null;
      }

      const sorted = [...values].sort((a, b) => a - b);
      const mean =
        values.reduce((sum, value) => sum + value, 0) / values.length;
      const median =
        sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
      const variance =
        values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        values.length;

      return {
        column,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        mean,
        median,
        std: Math.sqrt(variance),
      };
    })
    .filter(Boolean) as Array<{
    column: string;
    count: number;
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
  }>;
}

function pearsonCorrelation(x: number[], y: number[]) {
  if (!x.length || !y.length || x.length !== y.length) {
    return 0;
  }

  const n = x.length;
  const avgX = x.reduce((sum, value) => sum + value, 0) / n;
  const avgY = y.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = x[i] - avgX;
    const dy = y[i] - avgY;
    numerator += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0 || denY === 0) {
    return 0;
  }

  return numerator / Math.sqrt(denX * denY);
}

function heatColor(value: number) {
  const clamped = Math.max(-1, Math.min(1, value));
  const hue = clamped >= 0 ? 190 - clamped * 190 : 0;
  const saturation = 75;
  const lightness = 55 - Math.abs(clamped) * 10;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

async function parseSpreadsheet(file: File): Promise<DataRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
  }) as DataRow[];
}

function makeHistogram(values: number[], binCount = 8) {
  if (!values.length) {
    return [] as Array<{ label: string; count: number }>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max === min ? 1 : (max - min) / binCount;

  const bins = Array.from({ length: binCount }).map((_, index) => {
    const start = min + index * width;
    const end = index === binCount - 1 ? max : start + width;
    return {
      label: `${start.toFixed(1)}-${end.toFixed(1)}`,
      start,
      end,
      count: 0,
    };
  });

  values.forEach((value) => {
    const rawIndex = width === 0 ? 0 : Math.floor((value - min) / width);
    const index = Math.min(binCount - 1, Math.max(0, rawIndex));
    bins[index].count += 1;
  });

  return bins.map(({ label, count }) => ({ label, count }));
}

function extractFileNameFromUrl(urlValue: string) {
  try {
    const parsed = new URL(urlValue);
    const candidate = parsed.pathname.split("/").pop() || "dataset";
    return decodeURIComponent(candidate) || "dataset";
  } catch {
    return "dataset";
  }
}

function extensionFromName(name: string) {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) {
    return "";
  }
  return name.slice(dot + 1).toLowerCase();
}

function resolveDatasetExtension(nameFromUrl: string, contentType: string) {
  const byName = extensionFromName(nameFromUrl);
  if (["csv", "xlsx", "xls"].includes(byName)) {
    return byName;
  }

  const type = contentType.toLowerCase();
  if (type.includes("spreadsheet") || type.includes("excel")) {
    return "xlsx";
  }
  if (type.includes("csv") || type.includes("comma-separated-values")) {
    return "csv";
  }

  return "";
}

function formatDatasetName(name: string, extension: string) {
  const safeBase = stripExtension(name || "dataset") || "dataset";
  return `${safeBase}.${extension}`;
}

function trendSeries(rows: DataRow[], column: string, limit = 80) {
  return rows
    .map((row, index) => {
      const value = toNumber(row[column]);
      if (value === null) {
        return null;
      }
      return { label: String(index + 1), value };
    })
    .filter(Boolean)
    .slice(0, limit) as Array<{ label: string; value: number }>;
}

function movingAverageSeries(
  rows: DataRow[],
  column: string,
  windowSize: number,
  limit = 80,
) {
  const base = trendSeries(rows, column, limit).map((item) => item.value);
  if (!base.length) {
    return [] as Array<{ label: string; value: number }>;
  }

  const normalizedWindow = Math.max(2, windowSize);
  const result: Array<{ label: string; value: number }> = [];

  for (let i = 0; i < base.length; i += 1) {
    const from = Math.max(0, i - normalizedWindow + 1);
    const subset = base.slice(from, i + 1);
    const avg = subset.reduce((sum, value) => sum + value, 0) / subset.length;
    result.push({ label: String(i + 1), value: Number(avg.toFixed(4)) });
  }

  return result;
}

function cumulativeSeries(rows: DataRow[], column: string, limit = 80) {
  const base = trendSeries(rows, column, limit);
  let running = 0;
  return base.map((item) => {
    running += item.value;
    return { label: item.label, value: Number(running.toFixed(4)) };
  });
}

function histogramSeriesForColumn(rows: DataRow[], column: string, bins = 8) {
  const values = rows
    .map((row) => toNumber(row[column]))
    .filter((value): value is number => value !== null);

  return makeHistogram(values, bins).map((item) => ({
    label: item.label,
    value: item.count,
  }));
}

function iqrOutlierCount(values: number[]) {
  if (values.length < 4) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  return sorted.filter((value) => value < lower || value > upper).length;
}

async function buildOutputFile(
  rows: DataRow[],
  format: "csv" | "xlsx",
  originalFileName: string,
) {
  const safeBaseName = stripExtension(originalFileName || "dataset");
  const outputName = `${safeBaseName} - Aditya Sarode.${format}`;

  const worksheet = XLSX.utils.json_to_sheet(rows);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const file = new File([blob], outputName, { type: "text/csv" });
    return { blob, file, outputName };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Data");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const file = new File([blob], outputName, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return { blob, file, outputName };
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function DataAnalysisPage() {
  const allowed = useProtectedPage();
  const [fileName, setFileName] = React.useState("");
  const [rows, setRows] = React.useState<DataRow[]>([]);
  const [columns, setColumns] = React.useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>([]);
  const [isParsing, setIsParsing] = React.useState(false);

  const [removeDuplicates, setRemoveDuplicates] = React.useState(true);
  const [trimStrings, setTrimStrings] = React.useState(true);
  const [missingStrategy, setMissingStrategy] =
    React.useState<MissingStrategy>("none");

  const [sendFormat, setSendFormat] = React.useState<"csv" | "xlsx">("csv");
  const [isSending, setIsSending] = React.useState(false);
  const [storedFiles, setStoredFiles] = React.useState<
    DataAnalysisStoredFile[]
  >([]);
  const [isFilesLoading, setIsFilesLoading] = React.useState(false);
  const [datasetUrl, setDatasetUrl] = React.useState("");
  const [isImportingUrl, setIsImportingUrl] = React.useState(false);
  const [previewColumnQuery, setPreviewColumnQuery] = React.useState("");

  const columnTypes = React.useMemo(
    () => getColumnTypes(rows, columns),
    [rows, columns],
  );
  const missingByColumn = React.useMemo(
    () => getMissingByColumn(rows, columns),
    [rows, columns],
  );
  const duplicateCount = React.useMemo(() => getDuplicateCount(rows), [rows]);

  const numericColumns = React.useMemo(
    () => columns.filter((column) => columnTypes[column] === "number"),
    [columns, columnTypes],
  );

  const basicStats = React.useMemo(
    () => getNumericStats(rows, numericColumns),
    [rows, numericColumns],
  );

  const lineChartData = React.useMemo(() => {
    const firstNumeric = numericColumns[0];
    if (!firstNumeric) {
      return [] as Array<{ index: number; value: number }>;
    }

    return rows
      .map((row, index) => {
        const value = toNumber(row[firstNumeric]);
        if (value === null) {
          return null;
        }

        return { index: index + 1, value };
      })
      .filter(Boolean)
      .slice(0, 80) as Array<{ index: number; value: number }>;
  }, [rows, numericColumns]);

  const histogramData = React.useMemo(() => {
    const firstNumeric = numericColumns[0];
    if (!firstNumeric) {
      return [] as Array<{ label: string; count: number }>;
    }

    const values = rows
      .map((row) => toNumber(row[firstNumeric]))
      .filter((value): value is number => value !== null);

    return makeHistogram(values);
  }, [rows, numericColumns]);

  const typePieData = React.useMemo(() => {
    const countByType = new Map<ColumnType, number>();
    columns.forEach((column) => {
      const type = columnTypes[column] || "empty";
      countByType.set(type, (countByType.get(type) || 0) + 1);
    });

    return [...countByType.entries()].map(([name, value]) => ({ name, value }));
  }, [columns, columnTypes]);

  const correlationMatrix = React.useMemo(() => {
    const selected = numericColumns.slice(0, 8);
    return selected.map((rowColumn) => {
      return selected.map((colColumn) => {
        const paired = rows
          .map((row) => {
            const x = toNumber(row[rowColumn]);
            const y = toNumber(row[colColumn]);
            return x === null || y === null ? null : { x, y };
          })
          .filter(Boolean) as Array<{ x: number; y: number }>;

        const xValues = paired.map((item) => item.x);
        const yValues = paired.map((item) => item.y);
        return pearsonCorrelation(xValues, yValues);
      });
    });
  }, [rows, numericColumns]);

  const topCategoryData = React.useMemo(() => {
    const firstStringColumn = columns.find(
      (column) => columnTypes[column] === "string",
    );
    if (!firstStringColumn) {
      return [] as Array<{ label: string; count: number }>;
    }

    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const value = row[firstStringColumn];
      if (isMissing(value)) {
        return;
      }
      const label = String(value).trim();
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));
  }, [rows, columns, columnTypes]);

  const qualityInsights = React.useMemo(() => {
    const totalCells = rows.length * columns.length;
    const missingCells = missingByColumn.reduce(
      (sum, item) => sum + item.missing,
      0,
    );
    const completeness =
      totalCells === 0 ? 0 : ((totalCells - missingCells) / totalCells) * 100;
    const heavyMissingColumns = missingByColumn.filter(
      (item) => rows.length > 0 && item.missing / rows.length >= 0.3,
    ).length;

    const firstNumeric = numericColumns[0];
    const firstNumericValues = firstNumeric
      ? rows
          .map((row) => toNumber(row[firstNumeric]))
          .filter((value): value is number => value !== null)
      : [];

    return {
      completeness: Number(completeness.toFixed(1)),
      heavyMissingColumns,
      outliers: iqrOutlierCount(firstNumericValues),
      numericColumnCount: numericColumns.length,
    };
  }, [rows, columns.length, missingByColumn, numericColumns]);

  const previewColumns = React.useMemo(() => {
    const base = selectedColumns.length ? selectedColumns : columns;
    const query = previewColumnQuery.trim().toLowerCase();
    if (!query) {
      return base;
    }
    return base.filter((column) => column.toLowerCase().includes(query));
  }, [selectedColumns, columns, previewColumnQuery]);

  const quickGraphGallery = React.useMemo(() => {
    if (!numericColumns.length) {
      return [] as QuickGraph[];
    }

    const graphs: QuickGraph[] = [];
    const seedColumns = numericColumns.slice(0, 5);

    seedColumns.forEach((column, index) => {
      const baseColor = CHART_COLORS[index % CHART_COLORS.length];
      const avgColor = CHART_COLORS[(index + 2) % CHART_COLORS.length];
      const histColor = CHART_COLORS[(index + 4) % CHART_COLORS.length];
      const cumColor = CHART_COLORS[(index + 6) % CHART_COLORS.length];

      graphs.push({
        key: `${column}-trend`,
        title: `${column} trend`,
        kind: "line",
        data: trendSeries(rows, column, 70),
        color: baseColor,
      });

      graphs.push({
        key: `${column}-moving-average`,
        title: `${column} moving average`,
        kind: "line",
        data: movingAverageSeries(rows, column, 3 + index * 2, 70),
        color: avgColor,
      });

      graphs.push({
        key: `${column}-histogram`,
        title: `${column} histogram`,
        kind: "bar",
        data: histogramSeriesForColumn(rows, column, 6 + index),
        color: histColor,
      });

      graphs.push({
        key: `${column}-cumulative`,
        title: `${column} cumulative`,
        kind: "line",
        data: cumulativeSeries(rows, column, 70),
        color: cumColor,
      });
    });

    const primaryColumn = seedColumns[0];
    let filler = 0;
    while (graphs.length < 20) {
      if (filler % 2 === 0) {
        const window = 2 + (filler % 6);
        graphs.push({
          key: `${primaryColumn}-smoothed-${filler}`,
          title: `${primaryColumn} smooth w=${window}`,
          kind: "line",
          data: movingAverageSeries(rows, primaryColumn, window, 70),
          color: CHART_COLORS[filler % CHART_COLORS.length],
        });
      } else {
        const bins = 5 + (filler % 8);
        graphs.push({
          key: `${primaryColumn}-bins-${filler}`,
          title: `${primaryColumn} histogram ${bins} bins`,
          kind: "bar",
          data: histogramSeriesForColumn(rows, primaryColumn, bins),
          color: CHART_COLORS[filler % CHART_COLORS.length],
        });
      }
      filler += 1;
    }

    return graphs.slice(0, 25);
  }, [rows, numericColumns]);

  const cleanedRows = React.useMemo(() => {
    if (!rows.length) {
      return [] as DataRow[];
    }

    const keepColumns =
      selectedColumns.length > 0 ? selectedColumns : [...columns];

    const baseRows = rows.map((row) => {
      const next: DataRow = {};
      keepColumns.forEach((column) => {
        next[column] = row[column];
      });
      return next;
    });

    const meanByColumn = new Map<string, number>();
    if (missingStrategy === "fill-numeric-mean") {
      keepColumns.forEach((column) => {
        const values = baseRows
          .map((row) => toNumber(row[column]))
          .filter((value): value is number => value !== null);
        if (!values.length) {
          return;
        }
        meanByColumn.set(
          column,
          values.reduce((sum, value) => sum + value, 0) / values.length,
        );
      });
    }

    let transformed = baseRows
      .map((row) => {
        const next: DataRow = {};
        keepColumns.forEach((column) => {
          const original = row[column];
          if (trimStrings && typeof original === "string") {
            next[column] = original.trim();
          } else {
            next[column] = original;
          }
        });
        return next;
      })
      .filter((row) => {
        if (missingStrategy !== "drop-rows") {
          return true;
        }

        return !keepColumns.some((column) => isMissing(row[column]));
      })
      .map((row) => {
        if (missingStrategy === "fill-numeric-mean") {
          const next = { ...row };
          keepColumns.forEach((column) => {
            if (!isMissing(next[column])) {
              return;
            }
            if (meanByColumn.has(column)) {
              next[column] = Number(meanByColumn.get(column)?.toFixed(4));
            }
          });
          return next;
        }

        if (missingStrategy === "fill-empty-string") {
          const next = { ...row };
          keepColumns.forEach((column) => {
            if (isMissing(next[column])) {
              next[column] = "";
            }
          });
          return next;
        }

        return row;
      });

    if (removeDuplicates) {
      const seen = new Set<string>();
      transformed = transformed.filter((row) => {
        const signature = JSON.stringify(row);
        if (seen.has(signature)) {
          return false;
        }
        seen.add(signature);
        return true;
      });
    }

    return transformed;
  }, [
    rows,
    selectedColumns,
    columns,
    trimStrings,
    missingStrategy,
    removeDuplicates,
  ]);

  const cleanedPreviewRows = React.useMemo(
    () => cleanedRows.slice(0, 12),
    [cleanedRows],
  );

  const reloadStoredFiles = React.useCallback(async () => {
    if (!allowed) {
      return;
    }

    setIsFilesLoading(true);
    try {
      const rows = await api.getMyCleanedDataFiles();
      setStoredFiles(rows);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load cleaned files"));
    } finally {
      setIsFilesLoading(false);
    }
  }, [allowed]);

  React.useEffect(() => {
    reloadStoredFiles();
  }, [reloadStoredFiles]);

  const loadDatasetFile = React.useCallback(
    async (file: File, successMessage: string) => {
      if (file.size > MAX_DATASET_BYTES) {
        toast.error("File size must be 50MB or less");
        return;
      }

      const extension = extensionFromName(file.name);
      if (!["csv", "xlsx", "xls"].includes(extension)) {
        toast.error("Only CSV or Excel files are supported");
        return;
      }

      const parsedRows = await parseSpreadsheet(file);
      if (!parsedRows.length) {
        toast.error("No tabular data found in this file");
        return;
      }

      const parsedColumns = getColumns(parsedRows);
      setFileName(file.name);
      setRows(parsedRows);
      setColumns(parsedColumns);
      setSelectedColumns(parsedColumns);
      toast.success(successMessage);
    },
    [],
  );

  const handleUploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsParsing(true);
    try {
      await loadDatasetFile(file, "Data loaded successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to parse file"));
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  };

  const handleImportFromUrl = async () => {
    const inputUrl = datasetUrl.trim();
    if (!inputUrl) {
      toast.error("Enter a CSV or Excel file URL");
      return;
    }

    setIsImportingUrl(true);
    try {
      const response = await fetch(inputUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Unable to fetch file (${response.status})`);
      }

      const blob = await response.blob();
      if (blob.size > MAX_DATASET_BYTES) {
        throw new Error("File size must be 50MB or less");
      }

      const sourceName = extractFileNameFromUrl(inputUrl);
      const extension = resolveDatasetExtension(
        sourceName,
        response.headers.get("content-type") || "",
      );

      if (!["csv", "xlsx", "xls"].includes(extension)) {
        throw new Error("URL must point to a CSV or Excel file");
      }

      const resolvedName = formatDatasetName(sourceName, extension);
      const file = new File([blob], resolvedName, {
        type: blob.type || "application/octet-stream",
      });

      await loadDatasetFile(file, "Dataset imported from link");
      setDatasetUrl("");
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Unable to import file from link. Ensure the URL is public and CORS-enabled.",
        ),
      );
    } finally {
      setIsImportingUrl(false);
    }
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns((current) => {
      if (current.includes(column)) {
        return current.filter((item) => item !== column);
      }
      return [...current, column];
    });
  };

  const handleDownload = async (format: "csv" | "xlsx") => {
    if (!cleanedRows.length) {
      toast.error("Nothing to download");
      return;
    }

    const { blob, outputName } = await buildOutputFile(
      cleanedRows,
      format,
      fileName || "dataset",
    );
    triggerDownload(blob, outputName);
    toast.success(`Downloaded ${outputName}`);
  };

  const handleSendToEmail = async () => {
    if (!cleanedRows.length) {
      toast.error("Nothing to send");
      return;
    }

    setIsSending(true);
    try {
      const { file } = await buildOutputFile(
        cleanedRows,
        sendFormat,
        fileName || "dataset",
      );

      const uploaded = await api.uploadCleanedDataFile({
        file,
        originalFileName: fileName || "dataset",
        format: sendFormat,
      });

      if (uploaded.emailSent) {
        toast.success("Cleaned file emailed and stored for 30 minutes");
      } else {
        toast.warning(
          "File stored for 30 minutes, but email could not be delivered. Use the download list below.",
        );
      }
      await reloadStoredFiles();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to send cleaned file"));
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteStoredFile = async (id: string | number) => {
    try {
      await api.deleteCleanedDataFile(id);
      setStoredFiles((current) =>
        current.filter((item) => String(item.id) !== String(id)),
      );
      toast.success("Stored file removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove stored file"));
    }
  };

  if (!allowed) {
    return <div className="py-8" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Data Analysis
        </h1>
        <p className="mt-1 text-muted-foreground">
          Upload CSV or Excel files, analyze quality, clean data, and export.
        </p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            Upload Dataset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="datasetFile">CSV or Excel file</Label>
            <Input
              id="datasetFile"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleUploadFile}
              disabled={isParsing}
            />
            <p className="text-xs text-muted-foreground">
              Maximum upload size: 50MB (.csv, .xlsx, .xls)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="datasetUrl" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              CSV/Excel link
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="datasetUrl"
                value={datasetUrl}
                onChange={(event) => setDatasetUrl(event.target.value)}
                placeholder="https://example.com/dataset.csv"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleImportFromUrl}
                disabled={isImportingUrl}
              >
                {isImportingUrl ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Import Link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The link must be public and allow cross-origin downloads.
            </p>
          </div>

          {fileName ? (
            <div className="text-sm text-muted-foreground">
              Loaded file:{" "}
              <span className="font-medium text-foreground">{fileName}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {rows.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-2xl font-semibold">{rows.length}</p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-2xl font-semibold">{columns.length}</p>
                <p className="text-sm text-muted-foreground">Total Columns</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-2xl font-semibold">{duplicateCount}</p>
                <p className="text-sm text-muted-foreground">Duplicate Rows</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-2xl font-semibold">
                  {missingByColumn.reduce((sum, row) => sum + row.missing, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Missing Values</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-2xl font-semibold">
                  {qualityInsights.completeness}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Completeness Score
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-2xl font-semibold">
                  {qualityInsights.heavyMissingColumns}
                </p>
                <p className="text-sm text-muted-foreground">
                  Columns With 30%+ Missing
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-2xl font-semibold">
                  {qualityInsights.outliers}
                </p>
                <p className="text-sm text-muted-foreground">
                  Potential Outliers (IQR)
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-2xl font-semibold">
                  {qualityInsights.numericColumnCount}
                </p>
                <p className="text-sm text-muted-foreground">Numeric Columns</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">
                Data Types and Missing Values
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      <th className="px-3 py-3 text-left text-sm">Column</th>
                      <th className="px-3 py-3 text-left text-sm">Type</th>
                      <th className="px-3 py-3 text-left text-sm">Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((column) => {
                      const missing =
                        missingByColumn.find((row) => row.column === column)
                          ?.missing || 0;
                      return (
                        <tr key={column} className="border-b border-border/30">
                          <td className="px-3 py-3 text-sm font-medium">
                            {column}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <Badge variant="outline">
                              {columnTypes[column]}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-sm">{missing}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {basicStats.length > 0 ? (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Basic Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/20">
                        <th className="px-3 py-3 text-left text-sm">Column</th>
                        <th className="px-3 py-3 text-left text-sm">Count</th>
                        <th className="px-3 py-3 text-left text-sm">Min</th>
                        <th className="px-3 py-3 text-left text-sm">Max</th>
                        <th className="px-3 py-3 text-left text-sm">Mean</th>
                        <th className="px-3 py-3 text-left text-sm">Median</th>
                        <th className="px-3 py-3 text-left text-sm">Std Dev</th>
                      </tr>
                    </thead>
                    <tbody>
                      {basicStats.map((stat) => (
                        <tr
                          key={stat.column}
                          className="border-b border-border/30"
                        >
                          <td className="px-3 py-3 text-sm font-medium">
                            {stat.column}
                          </td>
                          <td className="px-3 py-3 text-sm">{stat.count}</td>
                          <td className="px-3 py-3 text-sm">
                            {stat.min.toFixed(3)}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            {stat.max.toFixed(3)}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            {stat.mean.toFixed(3)}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            {stat.median.toFixed(3)}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            {stat.std.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">
                  Missing Values by Column (Bar Chart)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={missingByColumn}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="column"
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="missing" fill="#0f766e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">
                  Row Trend (Line Chart)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="index" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#1d4ed8"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">
                  Distribution (Histogram)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ea580c" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">
                  Column Type Split (Pie Chart)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typePieData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={86}
                      >
                        {typePieData.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Correlation Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                {numericColumns.length > 1 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-[560px] border-collapse">
                      <thead>
                        <tr>
                          <th className="px-2 py-2 text-left text-xs text-muted-foreground" />
                          {numericColumns.slice(0, 8).map((column) => (
                            <th
                              key={column}
                              className="px-2 py-2 text-left text-xs text-muted-foreground"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {numericColumns
                          .slice(0, 8)
                          .map((rowColumn, rowIndex) => (
                            <tr key={rowColumn}>
                              <td className="px-2 py-2 text-xs text-muted-foreground">
                                {rowColumn}
                              </td>
                              {numericColumns
                                .slice(0, 8)
                                .map((colColumn, colIndex) => {
                                  const value =
                                    correlationMatrix[rowIndex]?.[colIndex] ||
                                    0;
                                  return (
                                    <td
                                      key={`${rowColumn}-${colColumn}`}
                                      className="h-10 w-20 px-2 py-2 text-center text-xs font-medium text-white"
                                      style={{
                                        backgroundColor: heatColor(value),
                                      }}
                                      title={`${rowColumn} vs ${colColumn}: ${value.toFixed(3)}`}
                                    >
                                      {value.toFixed(2)}
                                    </td>
                                  );
                                })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add at least two numeric columns to generate a correlation
                    heatmap.
                  </p>
                )}
              </CardContent>
            </Card>

            {topCategoryData.length > 0 ? (
              <Card className="border-border/50 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Top Category Values (Additional Visualization)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topCategoryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#16a34a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Data Cleaning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    removeDuplicates
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                  onClick={() => setRemoveDuplicates((prev) => !prev)}
                >
                  Remove duplicates: {removeDuplicates ? "On" : "Off"}
                </button>

                <button
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    trimStrings
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                  onClick={() => setTrimStrings((prev) => !prev)}
                >
                  Trim text values: {trimStrings ? "On" : "Off"}
                </button>

                <select
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  value={missingStrategy}
                  onChange={(event) =>
                    setMissingStrategy(event.target.value as MissingStrategy)
                  }
                >
                  <option value="none">Missing: Keep as-is</option>
                  <option value="drop-rows">Missing: Drop rows</option>
                  <option value="fill-numeric-mean">
                    Missing: Fill numeric mean
                  </option>
                  <option value="fill-empty-string">
                    Missing: Fill empty string
                  </option>
                </select>

                <select
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  value={sendFormat}
                  onChange={(event) =>
                    setSendFormat(event.target.value as "csv" | "xlsx")
                  }
                >
                  <option value="csv">Email format: CSV</option>
                  <option value="xlsx">Email format: Excel (.xlsx)</option>
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Column Selection</p>
                <div className="flex flex-wrap gap-2">
                  {columns.map((column) => {
                    const active = selectedColumns.includes(column);
                    return (
                      <button
                        key={column}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs ${
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground"
                        }`}
                        onClick={() => toggleColumn(column)}
                      >
                        {active ? "Included" : "Excluded"}: {column}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="previewColumnQuery">
                  Preview columns filter
                </Label>
                <Input
                  id="previewColumnQuery"
                  value={previewColumnQuery}
                  onChange={(event) =>
                    setPreviewColumnQuery(event.target.value)
                  }
                  placeholder="Type part of a column name"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => handleDownload("csv")}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Cleaned CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownload("xlsx")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Cleaned Excel
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSendToEmail}
                  disabled={isSending}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {isSending ? "Sending..." : "Email Cleaned File"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Cleaned file name format:{" "}
                {stripExtension(fileName || "dataset")} - Aditya
                Sarode.csv/.xlsx
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Cleaned Data Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Showing first {cleanedPreviewRows.length} of{" "}
                {cleanedRows.length} cleaned rows.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      {previewColumns.map((column) => (
                        <th
                          key={column}
                          className="px-3 py-3 text-left text-sm"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cleanedPreviewRows.map((row, index) => (
                      <tr key={index} className="border-b border-border/30">
                        {previewColumns.map((column) => (
                          <td
                            key={`${index}-${column}`}
                            className="px-3 py-3 text-sm"
                          >
                            {isMissing(row[column]) ? (
                              <span className="text-muted-foreground">
                                (empty)
                              </span>
                            ) : (
                              String(row[column])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">
                Advanced Graph Gallery ({quickGraphGallery.length} graphs)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quickGraphGallery.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add at least one numeric column to generate advanced graphs.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {quickGraphGallery.map((graph) => (
                    <div
                      key={graph.key}
                      className="rounded-xl border border-border/40 p-3"
                    >
                      <p className="mb-2 text-sm font-medium text-foreground">
                        {graph.title}
                      </p>
                      <div className="h-[170px]">
                        <ResponsiveContainer width="100%" height="100%">
                          {graph.kind === "bar" ? (
                            <BarChart data={graph.data}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" hide />
                              <YAxis hide />
                              <Tooltip />
                              <Bar dataKey="value" fill={graph.color} />
                            </BarChart>
                          ) : (
                            <LineChart data={graph.data}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" hide />
                              <YAxis hide />
                              <Tooltip />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke={graph.color}
                                dot={false}
                              />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Temporary Stored Cleaned Files (30 min)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={reloadStoredFiles}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isFilesLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading cleaned files...
            </p>
          ) : null}

          {!isFilesLoading && storedFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cleaned files stored right now.
            </p>
          ) : null}

          {storedFiles.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border border-border/40 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">
                  {item.cleanedFileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Original: {item.originalFileName} • Created:{" "}
                  {toIsoDate(item.createdAt)} • Expires:{" "}
                  {toIsoDate(item.expiresAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={item.downloadUrl} target="_blank" rel="noreferrer">
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                    Download
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteStoredFile(item.id)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
