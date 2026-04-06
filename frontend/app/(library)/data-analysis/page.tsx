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
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Treemap,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
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
  "#0ea5e9",
  "#ea580c",
  "#16a34a",
  "#dc2626",
  "#f97316",
  "#2563eb",
];
const GRAPH_CARD_BACKGROUNDS = [
  "from-sky-50 via-white to-cyan-100",
  "from-emerald-50 via-white to-lime-100",
  "from-amber-50 via-white to-orange-100",
  "from-rose-50 via-white to-red-100",
  "from-indigo-50 via-white to-blue-100",
  "from-fuchsia-50 via-white to-pink-100",
];
const FAMILY_COLORS: Record<
  GraphFamily,
  {
    primary: string;
    accent: string;
  }
> = {
  Core: { primary: "#2563eb", accent: "#0ea5e9" },
  Distribution: { primary: "#7c3aed", accent: "#a855f7" },
  Relationship: { primary: "#0891b2", accent: "#0ea5e9" },
  Time: { primary: "#16a34a", accent: "#22c55e" },
  Structure: { primary: "#ea580c", accent: "#fb923c" },
  Geo: { primary: "#0284c7", accent: "#38bdf8" },
  Advanced: { primary: "#db2777", accent: "#f472b6" },
};

const AXIS_LABEL_BY_CHART_TYPE: Record<string, { x: string; y: string }> = {
  "line-chart": { x: "Index", y: "Value" },
  "multi-line-chart": { x: "Index", y: "Value" },
  "area-chart": { x: "Index", y: "Value" },
  "stacked-area-chart": { x: "Index", y: "Stacked value" },
  "bar-chart": { x: "Category", y: "Value" },
  "horizontal-bar-chart": { x: "Value", y: "Category" },
  "grouped-bar-chart": { x: "Category", y: "Grouped value" },
  "stacked-bar-chart": { x: "Category", y: "Stacked value" },
  "stacked-bar-100-chart": { x: "Category", y: "Percentage" },
  histogram: { x: "Bin range", y: "Frequency" },
  "scatter-plot": { x: "X metric", y: "Y metric" },
  "bubble-chart": { x: "X metric", y: "Y metric" },
  "time-series-rolling-average": { x: "Time", y: "Value" },
  "step-chart": { x: "Step index", y: "Value" },
};
const MAX_DATASET_BYTES = 50 * 1024 * 1024;

type DataRow = Record<string, unknown>;
type ColumnType = "number" | "boolean" | "date" | "string" | "mixed" | "empty";
type MissingStrategy =
  | "none"
  | "drop-rows"
  | "fill-numeric-mean"
  | "fill-empty-string";

type GraphFamily =
  | "Core"
  | "Distribution"
  | "Relationship"
  | "Time"
  | "Structure"
  | "Geo"
  | "Advanced";

type AxisUnit = "count" | "percent" | "score";

type AxisProfile = {
  xLabel: string;
  yLabel: string;
  unit: AxisUnit;
  scale: "linear" | "normalized 0-100" | "indexed";
};

type GraphDatum = {
  label: string;
  value: number;
  value2: number;
  value3: number;
  value4: number;
  size: number;
  open: number;
  close: number;
  high: number;
  low: number;
  x: number;
  y: number;
};

type QuickGraph = {
  key: string;
  title: string;
  chartType: string;
  family: GraphFamily;
  data: GraphDatum[];
  color: string;
  accent: string;
};

const REQUESTED_GRAPH_TYPES: Array<{
  chartType: string;
  title: string;
  family: GraphFamily;
}> = [
  { chartType: "line-chart", title: "Line chart", family: "Core" },
  { chartType: "multi-line-chart", title: "Multi-line chart", family: "Core" },
  { chartType: "area-chart", title: "Area chart", family: "Core" },
  {
    chartType: "stacked-area-chart",
    title: "Stacked area chart",
    family: "Core",
  },
  { chartType: "bar-chart", title: "Bar chart", family: "Core" },
  {
    chartType: "horizontal-bar-chart",
    title: "Horizontal bar chart",
    family: "Core",
  },
  {
    chartType: "grouped-bar-chart",
    title: "Grouped bar chart",
    family: "Core",
  },
  {
    chartType: "stacked-bar-chart",
    title: "Stacked bar chart",
    family: "Core",
  },
  {
    chartType: "stacked-bar-100-chart",
    title: "100% stacked bar chart",
    family: "Core",
  },
  { chartType: "histogram", title: "Histogram", family: "Core" },
  { chartType: "box-plot", title: "Box plot", family: "Distribution" },
  { chartType: "violin-plot", title: "Violin plot", family: "Distribution" },
  { chartType: "swarm-plot", title: "Swarm plot", family: "Distribution" },
  { chartType: "strip-plot", title: "Strip plot", family: "Distribution" },
  { chartType: "kde-plot", title: "KDE plot", family: "Distribution" },
  {
    chartType: "ridgeline-plot",
    title: "Ridgeline plot",
    family: "Distribution",
  },
  {
    chartType: "density-heatmap",
    title: "Density heatmap",
    family: "Distribution",
  },
  { chartType: "scatter-plot", title: "Scatter plot", family: "Relationship" },
  { chartType: "bubble-chart", title: "Bubble chart", family: "Relationship" },
  { chartType: "hexbin-plot", title: "Hexbin plot", family: "Relationship" },
  { chartType: "pair-plot", title: "Pair plot", family: "Relationship" },
  {
    chartType: "correlation-heatmap",
    title: "Correlation heatmap",
    family: "Relationship",
  },
  { chartType: "scatter-3d", title: "3D scatter plot", family: "Relationship" },
  {
    chartType: "time-series-rolling-average",
    title: "Time series with rolling average",
    family: "Time",
  },
  {
    chartType: "candlestick-chart",
    title: "Candlestick chart",
    family: "Time",
  },
  { chartType: "ohlc-chart", title: "OHLC chart", family: "Time" },
  { chartType: "calendar-heatmap", title: "Calendar heatmap", family: "Time" },
  { chartType: "stream-graph", title: "Stream graph", family: "Time" },
  { chartType: "step-chart", title: "Step chart", family: "Time" },
  { chartType: "tree-diagram", title: "Tree diagram", family: "Structure" },
  { chartType: "dendrogram", title: "Dendrogram", family: "Structure" },
  { chartType: "treemap", title: "Treemap", family: "Structure" },
  { chartType: "sunburst-chart", title: "Sunburst chart", family: "Structure" },
  { chartType: "icicle-chart", title: "Icicle chart", family: "Structure" },
  { chartType: "choropleth-map", title: "Choropleth map", family: "Geo" },
  { chartType: "geo-scatter-plot", title: "Geo scatter plot", family: "Geo" },
  { chartType: "map-heatmap", title: "Heat map (map-based)", family: "Geo" },
  { chartType: "flow-map", title: "Flow map", family: "Geo" },
  { chartType: "cartogram", title: "Cartogram", family: "Geo" },
  { chartType: "sankey-diagram", title: "Sankey diagram", family: "Advanced" },
  { chartType: "chord-diagram", title: "Chord diagram", family: "Advanced" },
  { chartType: "network-graph", title: "Network graph", family: "Advanced" },
  {
    chartType: "parallel-coordinates-plot",
    title: "Parallel coordinates plot",
    family: "Advanced",
  },
  { chartType: "radar-chart", title: "Radar chart", family: "Advanced" },
  { chartType: "funnel-chart", title: "Funnel chart", family: "Advanced" },
  {
    chartType: "waterfall-chart",
    title: "Waterfall chart",
    family: "Advanced",
  },
  { chartType: "gauge-chart", title: "Gauge chart", family: "Advanced" },
  { chartType: "word-cloud", title: "Word cloud", family: "Advanced" },
  { chartType: "spiral-plot", title: "Spiral plot", family: "Advanced" },
  {
    chartType: "animated-bar-race-chart",
    title: "Animated bar race chart",
    family: "Advanced",
  },
];

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
  const [activeStoredFileId, setActiveStoredFileId] = React.useState<
    string | null
  >(null);
  const [fullscreenGraphKey, setFullscreenGraphKey] = React.useState<
    string | null
  >(null);
  const [showGraphCards, setShowGraphCards] = React.useState(false);
  const [datasetUrl, setDatasetUrl] = React.useState("");
  const [isImportingUrl, setIsImportingUrl] = React.useState(false);
  const [previewColumnQuery, setPreviewColumnQuery] = React.useState("");

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenGraphKey(null);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

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
    if (!rows.length) {
      return [] as QuickGraph[];
    }

    const firstNumeric = numericColumns[0] || "";
    const secondNumeric = numericColumns[1] || firstNumeric;
    const thirdNumeric = numericColumns[2] || secondNumeric || firstNumeric;

    const syntheticSeries = rows.slice(0, 72).map((row, index) => ({
      label: String(index + 1),
      value: Number((Object.keys(row).length + (index % 9) + 1).toFixed(2)),
    }));

    const primarySeries = firstNumeric
      ? trendSeries(rows, firstNumeric, 72)
      : syntheticSeries;
    const secondarySeries = secondNumeric
      ? trendSeries(rows, secondNumeric, 72)
      : syntheticSeries.map((item, index) => ({
          label: item.label,
          value: Number((item.value * (1.04 + (index % 4) * 0.05)).toFixed(2)),
        }));
    const tertiarySeries = thirdNumeric
      ? trendSeries(rows, thirdNumeric, 72)
      : syntheticSeries.map((item, index) => ({
          label: item.label,
          value: Number((item.value * (0.82 + (index % 5) * 0.04)).toFixed(2)),
        }));

    const pickValue = (
      series: Array<{ label: string; value: number }>,
      index: number,
      fallback: number,
    ) => {
      if (!series.length) {
        return fallback;
      }
      const item = series[index] || series[index % series.length];
      return item?.value ?? fallback;
    };

    const pickLabel = (
      series: Array<{ label: string; value: number }>,
      index: number,
    ) => {
      if (!series.length) {
        return String(index + 1);
      }
      const item = series[index] || series[index % series.length];
      return item?.label || String(index + 1);
    };

    const baseCount = Math.max(
      24,
      Math.min(
        72,
        Math.max(
          primarySeries.length,
          secondarySeries.length,
          tertiarySeries.length,
          syntheticSeries.length,
        ),
      ),
    );

    const baseData: GraphDatum[] = Array.from({ length: baseCount }).map(
      (_, index) => {
        const v1 = Math.abs(pickValue(primarySeries, index, index + 1));
        const v2 = Math.abs(pickValue(secondarySeries, index, v1 * 0.9 + 1));
        const v3 = Math.abs(pickValue(tertiarySeries, index, v1 * 0.7 + 1));
        const low = Math.min(v1, v2, v3) * 0.9;
        const high = Math.max(v1, v2, v3) * 1.12;

        return {
          label: pickLabel(primarySeries, index),
          value: Number(v1.toFixed(3)),
          value2: Number(v2.toFixed(3)),
          value3: Number(v3.toFixed(3)),
          value4: Number(((v1 + v2 + v3) / 3).toFixed(3)),
          size: Number((12 + (v3 % 28)).toFixed(3)),
          open: Number(v2.toFixed(3)),
          close: Number(v1.toFixed(3)),
          low: Number(low.toFixed(3)),
          high: Number(high.toFixed(3)),
          x: Number(((index / Math.max(1, baseCount - 1)) * 100).toFixed(3)),
          y: Number((v2 % 100).toFixed(3)),
        };
      },
    );

    const groupedData = baseData.slice(0, 12).map((point, index) => ({
      ...point,
      label: topCategoryData[index]?.label || `Category ${index + 1}`,
      value: Number(Math.max(1, Math.round(point.value)).toFixed(3)),
      value2: Number(Math.max(1, Math.round(point.value2)).toFixed(3)),
      value3: Number(Math.max(1, Math.round(point.value3)).toFixed(3)),
    }));

    const histogramRaw = firstNumeric
      ? histogramSeriesForColumn(rows, firstNumeric, 12)
      : makeHistogram(
          baseData.map((item) => item.value),
          12,
        ).map((item) => ({ label: item.label, value: item.count }));

    const histogramDataForGraphs: GraphDatum[] = histogramRaw.map(
      (item, index) => ({
        label: item.label,
        value: Number(item.value.toFixed(3)),
        value2: Number((item.value * (0.7 + (index % 3) * 0.12)).toFixed(3)),
        value3: Number((item.value * (0.55 + (index % 4) * 0.1)).toFixed(3)),
        value4: Number(item.value.toFixed(3)),
        size: Number((10 + (index % 6) * 4).toFixed(3)),
        open: Number((item.value * 0.9).toFixed(3)),
        close: Number(item.value.toFixed(3)),
        low: Number((item.value * 0.75).toFixed(3)),
        high: Number((item.value * 1.1).toFixed(3)),
        x: Number((index * 7.5).toFixed(3)),
        y: Number((item.value % 100).toFixed(3)),
      }),
    );

    const percentStackedData: GraphDatum[] = groupedData.map((point) => {
      const total = Math.max(1, point.value + point.value2 + point.value3);
      return {
        ...point,
        value: Number(((point.value / total) * 100).toFixed(3)),
        value2: Number(((point.value2 / total) * 100).toFixed(3)),
        value3: Number(((point.value3 / total) * 100).toFixed(3)),
      };
    });

    const rollingData: GraphDatum[] = baseData.map((point, index) => {
      const from = Math.max(0, index - 6);
      const subset = baseData.slice(from, index + 1);
      const avg =
        subset.reduce((sum, item) => sum + item.value, 0) /
        Math.max(1, subset.length);

      return {
        ...point,
        value2: Number(avg.toFixed(3)),
      };
    });

    const calendarData: GraphDatum[] = baseData
      .slice(0, 35)
      .map((point, i) => ({
        ...point,
        label: `D${i + 1}`,
        x: i % 7,
        y: Math.floor(i / 7),
        value: Number((point.value % 100).toFixed(3)),
      }));

    let runningTotal = 0;
    const waterfallData: GraphDatum[] = groupedData
      .slice(0, 10)
      .map((point, i) => {
        const delta =
          (i % 2 === 0 ? 1 : -1) *
          Math.max(4, Math.round((point.value + point.value2) * 0.14));
        const open = runningTotal;
        const close = runningTotal + delta;
        runningTotal = close;
        return {
          ...point,
          label: `Step ${i + 1}`,
          value: Number(delta.toFixed(3)),
          open: Number(open.toFixed(3)),
          close: Number(close.toFixed(3)),
          low: Number(Math.min(open, close).toFixed(3)),
          high: Number(Math.max(open, close).toFixed(3)),
        };
      });

    const gaugeSeed = baseData[0] || {
      label: "Gauge",
      value: 65,
      value2: 65,
      value3: 65,
      value4: 65,
      size: 24,
      open: 60,
      close: 65,
      high: 72,
      low: 54,
      x: 50,
      y: 50,
    };

    const dataByType: Record<string, GraphDatum[]> = {
      "line-chart": baseData,
      "multi-line-chart": baseData,
      "area-chart": baseData,
      "stacked-area-chart": baseData,
      "bar-chart": groupedData,
      "horizontal-bar-chart": groupedData,
      "grouped-bar-chart": groupedData,
      "stacked-bar-chart": groupedData,
      "stacked-bar-100-chart": percentStackedData,
      histogram: histogramDataForGraphs,
      "box-plot": histogramDataForGraphs,
      "violin-plot": histogramDataForGraphs,
      "swarm-plot": baseData,
      "strip-plot": baseData,
      "kde-plot": histogramDataForGraphs,
      "ridgeline-plot": histogramDataForGraphs,
      "density-heatmap": baseData,
      "scatter-plot": baseData,
      "bubble-chart": baseData,
      "hexbin-plot": baseData,
      "pair-plot": baseData.slice(0, 18),
      "correlation-heatmap": baseData.slice(0, 36),
      "scatter-3d": baseData,
      "time-series-rolling-average": rollingData,
      "candlestick-chart": rollingData,
      "ohlc-chart": rollingData,
      "calendar-heatmap": calendarData,
      "stream-graph": baseData,
      "step-chart": baseData,
      "tree-diagram": groupedData,
      dendrogram: groupedData,
      treemap: groupedData,
      "sunburst-chart": groupedData,
      "icicle-chart": groupedData,
      "choropleth-map": groupedData,
      "geo-scatter-plot": baseData,
      "map-heatmap": groupedData,
      "flow-map": groupedData,
      cartogram: groupedData,
      "sankey-diagram": groupedData,
      "chord-diagram": groupedData,
      "network-graph": groupedData,
      "parallel-coordinates-plot": baseData,
      "radar-chart": groupedData,
      "funnel-chart": groupedData,
      "waterfall-chart": waterfallData,
      "gauge-chart": [
        {
          ...gaugeSeed,
          value: Number(
            Math.max(1, Math.min(100, gaugeSeed.value % 100)).toFixed(3),
          ),
        },
      ],
      "word-cloud": groupedData,
      "spiral-plot": baseData,
      "animated-bar-race-chart": [...groupedData].sort(
        (a, b) => b.value - a.value,
      ),
    };

    return REQUESTED_GRAPH_TYPES.map((template, index) => {
      const familyColors = FAMILY_COLORS[template.family];

      return {
        key: `${template.chartType}-${index + 1}`,
        title: template.title,
        chartType: template.chartType,
        family: template.family,
        data: dataByType[template.chartType] || baseData,
        color: familyColors.primary,
        accent: familyColors.accent,
      };
    }).slice(0, 50);
  }, [rows, numericColumns, topCategoryData]);

  React.useEffect(() => {
    setShowGraphCards(false);
    if (!quickGraphGallery.length) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      setShowGraphCards(true);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [quickGraphGallery]);

  const tooltipContentStyle = React.useMemo(
    () => ({
      borderRadius: 12,
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
    }),
    [],
  );

  const renderSvgGraph = React.useCallback((graph: QuickGraph) => {
    const points = graph.data.slice(0, 40);
    if (!points.length) {
      return (
        <div className="flex h-full items-center justify-center text-xs text-slate-500">
          No chart data
        </div>
      );
    }

    const width = 100;
    const height = 60;
    const values = points.map((item) => item.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = Math.max(1, maxValue - minValue);

    const quantile = (sortedValues: number[], q: number) => {
      if (!sortedValues.length) {
        return 0;
      }
      const index = Math.min(
        sortedValues.length - 1,
        Math.max(0, Math.floor(q * (sortedValues.length - 1))),
      );
      return sortedValues[index];
    };

    const toX = (index: number, total = points.length) => {
      return 8 + (index / Math.max(1, total - 1)) * 84;
    };

    const toY = (value: number) => {
      return 52 - ((value - minValue) / range) * 44;
    };

    const polylinePoints = points
      .map((item, index) => `${toX(index)},${toY(item.value)}`)
      .join(" ");

    if (graph.chartType === "box-plot") {
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = quantile(sorted, 0.25);
      const median = quantile(sorted, 0.5);
      const q3 = quantile(sorted, 0.75);
      const min = sorted[0] || 0;
      const max = sorted[sorted.length - 1] || 0;
      const boxTop = toY(q3);
      const boxHeight = Math.max(2, toY(q1) - toY(q3));

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <line x1="18" x2="82" y1={toY(min)} y2={toY(min)} stroke="#64748b" />
          <line x1="18" x2="82" y1={toY(max)} y2={toY(max)} stroke="#64748b" />
          <line x1="50" x2="50" y1={toY(min)} y2={toY(max)} stroke="#64748b" />
          <rect
            x="34"
            y={boxTop}
            width="32"
            height={boxHeight}
            fill={graph.color}
            fillOpacity="0.25"
            stroke={graph.color}
            strokeWidth="1.5"
          />
          <line
            x1="34"
            x2="66"
            y1={toY(median)}
            y2={toY(median)}
            stroke={graph.accent}
            strokeWidth="2"
          />
        </svg>
      );
    }

    if (graph.chartType === "violin-plot") {
      const half = points.slice(0, 18);
      const leftSide = half.map((item, index) => {
        const y = 8 + (index / Math.max(1, half.length - 1)) * 44;
        const widthDelta = 8 + ((item.value - minValue) / range) * 16;
        return `${50 - widthDelta},${y}`;
      });
      const rightSide = [...half].reverse().map((item, index) => {
        const y =
          8 + ((half.length - 1 - index) / Math.max(1, half.length - 1)) * 44;
        const widthDelta = 8 + ((item.value - minValue) / range) * 16;
        return `${50 + widthDelta},${y}`;
      });

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <path
            d={`M ${leftSide.join(" L ")} L ${rightSide.join(" L ")} Z`}
            fill={graph.color}
            fillOpacity="0.25"
            stroke={graph.color}
            strokeWidth="1.6"
          />
        </svg>
      );
    }

    if (graph.chartType === "swarm-plot" || graph.chartType === "strip-plot") {
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {points.slice(0, 30).map((item, index) => {
            const x =
              graph.chartType === "strip-plot"
                ? 12 + (index % 12) * 7
                : 10 + (index % 10) * 8 + ((index % 2) * 2 - 1) * 1.5;
            const y =
              toY(item.value) +
              (graph.chartType === "swarm-plot" ? (index % 3) - 1 : 0);
            return (
              <circle
                key={`${graph.key}-dot-${index}`}
                cx={x}
                cy={y}
                r="1.7"
                fill={graph.color}
              />
            );
          })}
        </svg>
      );
    }

    if (graph.chartType === "kde-plot") {
      const pointsSlice = points.slice(0, 24);
      const curve = pointsSlice
        .map(
          (item, index) =>
            `${toX(index, pointsSlice.length)},${toY(item.value)}`,
        )
        .join(" ");
      const area = `${curve} ${toX(pointsSlice.length - 1, pointsSlice.length)},52 8,52`;
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <polygon points={area} fill={graph.color} fillOpacity="0.2" />
          <polyline
            points={curve}
            fill="none"
            stroke={graph.color}
            strokeWidth="2"
          />
        </svg>
      );
    }

    if (graph.chartType === "ridgeline-plot") {
      const layers = [0, 1, 2];
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {layers.map((layer) => {
            const subset = points.slice(layer * 8, layer * 8 + 10);
            const pointsLine = subset
              .map((item, index) => {
                const x = 10 + index * 8;
                const y =
                  50 - layer * 13 - ((item.value - minValue) / range) * 8;
                return `${x},${y}`;
              })
              .join(" ");
            return (
              <polyline
                key={`${graph.key}-ridge-${layer}`}
                points={pointsLine}
                fill="none"
                stroke={layer % 2 === 0 ? graph.color : graph.accent}
                strokeWidth="2"
                opacity="0.85"
              />
            );
          })}
        </svg>
      );
    }

    if (graph.chartType === "hexbin-plot") {
      const hexPath =
        "M 0 -2.8 L 2.4 -1.4 L 2.4 1.4 L 0 2.8 L -2.4 1.4 L -2.4 -1.4 Z";
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {Array.from({ length: 42 }).map((_, index) => {
            const row = Math.floor(index / 7);
            const col = index % 7;
            const x = 12 + col * 12 + (row % 2 === 0 ? 0 : 6);
            const y = 10 + row * 8;
            const intensity = 0.2 + (index % 5) * 0.15;
            return (
              <path
                key={`${graph.key}-hex-${index}`}
                d={hexPath}
                transform={`translate(${x} ${y})`}
                fill={graph.color}
                fillOpacity={Math.min(0.9, intensity)}
                stroke="#ffffff"
                strokeWidth="0.4"
              />
            );
          })}
        </svg>
      );
    }

    if (graph.chartType === "pair-plot") {
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => {
              const x = 8 + col * 30;
              const y = 6 + row * 17;
              return (
                <g key={`${graph.key}-pair-${row}-${col}`}>
                  <rect
                    x={x}
                    y={y}
                    width="24"
                    height="13"
                    fill="#ffffff"
                    stroke="#cbd5e1"
                  />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <circle
                      key={`${graph.key}-pair-dot-${row}-${col}-${i}`}
                      cx={x + 4 + (i % 3) * 7}
                      cy={y + 3 + Math.floor(i / 3) * 5}
                      r="0.9"
                      fill={i % 2 === 0 ? graph.color : graph.accent}
                    />
                  ))}
                </g>
              );
            }),
          )}
        </svg>
      );
    }

    if (graph.chartType === "scatter-3d") {
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <line x1="10" y1="52" x2="84" y2="52" stroke="#94a3b8" />
          <line x1="10" y1="52" x2="26" y2="10" stroke="#94a3b8" />
          <line x1="26" y1="10" x2="92" y2="10" stroke="#94a3b8" />
          {points.slice(0, 20).map((item, index) => {
            const x = 14 + (index % 8) * 9;
            const y = 48 - (index % 5) * 7 - ((item.value % 9) / 9) * 6;
            const r = 1 + (item.size % 3) * 0.4;
            return (
              <circle
                key={`${graph.key}-3d-${index}`}
                cx={x}
                cy={y}
                r={r}
                fill={index % 2 === 0 ? graph.color : graph.accent}
                fillOpacity="0.82"
              />
            );
          })}
        </svg>
      );
    }

    if (graph.chartType === "parallel-coordinates-plot") {
      const axes = [12, 32, 52, 72, 90];
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {axes.map((x, index) => (
            <line
              key={`${graph.key}-axis-${index}`}
              x1={x}
              x2={x}
              y1="8"
              y2="52"
              stroke="#94a3b8"
            />
          ))}
          {points.slice(0, 10).map((item, index) => {
            const polyline = axes
              .map((x, axisIndex) => {
                const axisValue =
                  axisIndex === 0
                    ? item.value
                    : axisIndex === 1
                      ? item.value2
                      : axisIndex === 2
                        ? item.value3
                        : axisIndex === 3
                          ? item.value4
                          : item.size;
                return `${x},${toY(axisValue)}`;
              })
              .join(" ");

            return (
              <polyline
                key={`${graph.key}-parallel-${index}`}
                points={polyline}
                fill="none"
                stroke={index % 2 === 0 ? graph.color : graph.accent}
                strokeOpacity="0.55"
                strokeWidth="1.1"
              />
            );
          })}
        </svg>
      );
    }

    if (graph.chartType === "waterfall-chart") {
      const bars = points.slice(0, 12);
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <line x1="8" x2="94" y1="52" y2="52" stroke="#94a3b8" />
          {bars.map((item, index) => {
            const x = 10 + index * 7;
            const openY = toY(item.open);
            const closeY = toY(item.close);
            const y = Math.min(openY, closeY);
            const h = Math.max(1.5, Math.abs(closeY - openY));
            const positive = item.close >= item.open;
            return (
              <rect
                key={`${graph.key}-water-${index}`}
                x={x}
                y={y}
                width="5"
                height={h}
                rx="0.9"
                fill={positive ? "#16a34a" : "#dc2626"}
              />
            );
          })}
        </svg>
      );
    }

    if (
      graph.chartType === "density-heatmap" ||
      graph.chartType === "correlation-heatmap" ||
      graph.chartType === "calendar-heatmap" ||
      graph.chartType === "map-heatmap"
    ) {
      const grid = graph.chartType === "calendar-heatmap" ? 7 : 6;
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {Array.from({ length: grid * grid }).map((_, index) => {
            const item = points[index % points.length];
            const x = 8 + (index % grid) * 14;
            const y = 6 + Math.floor(index / grid) * 9;
            const intensity = Math.max(
              0.15,
              Math.min(1, item.value / Math.max(1, maxValue)),
            );
            return (
              <rect
                key={`${graph.key}-cell-${index}`}
                x={x}
                y={y}
                width="11"
                height="7"
                rx="1.4"
                fill={graph.color}
                fillOpacity={intensity}
              />
            );
          })}
        </svg>
      );
    }

    if (
      graph.chartType === "candlestick-chart" ||
      graph.chartType === "ohlc-chart"
    ) {
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {points.slice(0, 14).map((item, index) => {
            const x = 8 + index * 6;
            const top = toY(item.high);
            const bottom = toY(item.low);
            const openY = toY(item.open);
            const closeY = toY(item.close);
            const bullish = item.close >= item.open;
            return (
              <g key={`${graph.key}-candle-${index}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={top}
                  y2={bottom}
                  stroke="#475569"
                  strokeWidth="1"
                />
                {graph.chartType === "candlestick-chart" ? (
                  <rect
                    x={x - 1.8}
                    y={Math.min(openY, closeY)}
                    width="3.6"
                    height={Math.max(1.2, Math.abs(closeY - openY))}
                    fill={bullish ? "#16a34a" : "#dc2626"}
                    rx="0.5"
                  />
                ) : (
                  <>
                    <line
                      x1={x - 2}
                      x2={x}
                      y1={openY}
                      y2={openY}
                      stroke="#0f172a"
                    />
                    <line
                      x1={x}
                      x2={x + 2}
                      y1={closeY}
                      y2={closeY}
                      stroke="#0f172a"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      );
    }

    if (
      graph.chartType === "tree-diagram" ||
      graph.chartType === "dendrogram" ||
      graph.chartType === "network-graph" ||
      graph.chartType === "flow-map" ||
      graph.chartType === "chord-diagram"
    ) {
      const nodes = points.slice(0, 9).map((item, index) => ({
        x: 16 + (index % 3) * 30,
        y: 12 + Math.floor(index / 3) * 17,
        size: 1.8 + (item.value % 3),
      }));

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {nodes.map((node, index) => {
            if (index === 0) {
              return null;
            }
            const parent = nodes[Math.floor((index - 1) / 2)] || nodes[0];
            return (
              <path
                key={`${graph.key}-link-${index}`}
                d={`M ${parent.x} ${parent.y} Q ${(parent.x + node.x) / 2} ${(parent.y + node.y) / 2 - 4} ${node.x} ${node.y}`}
                stroke="#64748b"
                strokeWidth="1"
                fill="none"
                opacity="0.8"
              />
            );
          })}
          {nodes.map((node, index) => (
            <circle
              key={`${graph.key}-node-${index}`}
              cx={node.x}
              cy={node.y}
              r={node.size}
              fill={index % 2 === 0 ? graph.color : graph.accent}
            />
          ))}
        </svg>
      );
    }

    if (
      graph.chartType === "choropleth-map" ||
      graph.chartType === "geo-scatter-plot" ||
      graph.chartType === "cartogram"
    ) {
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <path
            d="M8,16 L32,8 L44,16 L40,30 L22,38 L10,30 Z"
            fill={graph.color}
            fillOpacity="0.28"
            stroke="#334155"
          />
          <path
            d="M40,18 L60,10 L84,16 L80,30 L62,40 L42,34 Z"
            fill={graph.accent}
            fillOpacity="0.28"
            stroke="#334155"
          />
          <path
            d="M22,38 L44,30 L64,40 L56,52 L28,54 L16,46 Z"
            fill="#0ea5e9"
            fillOpacity="0.24"
            stroke="#334155"
          />
          {(graph.chartType === "geo-scatter-plot"
            ? points.slice(0, 12)
            : []
          ).map((item, index) => (
            <circle
              key={`${graph.key}-geo-${index}`}
              cx={14 + ((index * 17) % 70)}
              cy={12 + ((index * 11) % 40)}
              r={1.2 + (item.size % 2)}
              fill="#1e293b"
            />
          ))}
        </svg>
      );
    }

    if (graph.chartType === "sankey-diagram") {
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <rect
            x="8"
            y="12"
            width="12"
            height="18"
            rx="2"
            fill={graph.color}
            fillOpacity="0.7"
          />
          <rect
            x="44"
            y="8"
            width="12"
            height="14"
            rx="2"
            fill={graph.accent}
            fillOpacity="0.7"
          />
          <rect
            x="44"
            y="28"
            width="12"
            height="18"
            rx="2"
            fill="#64748b"
            fillOpacity="0.7"
          />
          <rect
            x="80"
            y="16"
            width="12"
            height="24"
            rx="2"
            fill="#334155"
            fillOpacity="0.7"
          />
          <path
            d="M20 18 C 30 18, 34 14, 44 14"
            stroke={graph.color}
            strokeWidth="4"
            fill="none"
            strokeOpacity="0.45"
          />
          <path
            d="M20 24 C 30 24, 34 36, 44 36"
            stroke={graph.color}
            strokeWidth="5"
            fill="none"
            strokeOpacity="0.35"
          />
          <path
            d="M56 15 C 66 15, 70 22, 80 22"
            stroke={graph.accent}
            strokeWidth="4"
            fill="none"
            strokeOpacity="0.45"
          />
          <path
            d="M56 36 C 66 36, 70 34, 80 34"
            stroke="#64748b"
            strokeWidth="6"
            fill="none"
            strokeOpacity="0.35"
          />
        </svg>
      );
    }

    if (
      graph.chartType === "sunburst-chart" ||
      graph.chartType === "gauge-chart"
    ) {
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <circle
            cx="50"
            cy="30"
            r="18"
            fill="none"
            stroke={graph.color}
            strokeWidth="8"
            strokeDasharray="68 40"
          />
          <circle
            cx="50"
            cy="30"
            r="10"
            fill="none"
            stroke={graph.accent}
            strokeWidth="7"
            strokeDasharray="26 28"
          />
          <circle cx="50" cy="30" r="4" fill="#0f172a" fillOpacity="0.65" />
        </svg>
      );
    }

    if (graph.chartType === "icicle-chart") {
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {points.slice(0, 12).map((item, index) => {
            const depth = index % 4;
            const x = 6 + depth * 18;
            const y = 6 + Math.floor(index / 4) * 13;
            const widthBlock = 30 - depth * 3;
            const opacity = 0.25 + (item.value % 7) / 10;
            return (
              <rect
                key={`${graph.key}-icicle-${index}`}
                x={x}
                y={y}
                width={widthBlock}
                height="10"
                rx="1.5"
                fill={graph.color}
                fillOpacity={opacity}
              />
            );
          })}
        </svg>
      );
    }

    if (graph.chartType === "word-cloud") {
      const words = points.slice(0, 10).map((item, index) => ({
        text: item.label.split(" ")[0],
        size: 7 + (item.value % 8),
        x: 10 + ((index * 13) % 75),
        y: 14 + ((index * 9) % 40),
      }));
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {words.map((word, index) => (
            <text
              key={`${graph.key}-word-${index}`}
              x={word.x}
              y={word.y}
              fontSize={word.size}
              fill={index % 2 === 0 ? graph.color : graph.accent}
              opacity="0.82"
            >
              {word.text}
            </text>
          ))}
        </svg>
      );
    }

    if (graph.chartType === "spiral-plot") {
      const pointsOnSpiral = Array.from({ length: 90 }).map((_, index) => {
        const angle = index * 0.34;
        const radius = 1.2 + index * 0.22;
        const x = 50 + Math.cos(angle) * radius;
        const y = 30 + Math.sin(angle) * radius;
        return `${x.toFixed(3)},${y.toFixed(3)}`;
      });

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <polyline
            points={pointsOnSpiral.join(" ")}
            fill="none"
            stroke={graph.color}
            strokeWidth="1.8"
          />
        </svg>
      );
    }

    if (graph.chartType === "animated-bar-race-chart") {
      const bars = [...points].slice(0, 8).sort((a, b) => b.value - a.value);
      const top = Math.max(1, bars[0]?.value || 1);

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {bars.map((item, index) => {
            const widthValue = (item.value / top) * 70;
            const y = 6 + index * 6.2;
            return (
              <g key={`${graph.key}-race-${index}`}>
                <rect
                  x="16"
                  y={y}
                  width="72"
                  height="4.5"
                  rx="2"
                  fill="#e2e8f0"
                />
                <rect
                  x="16"
                  y={y}
                  width="0"
                  height="4.5"
                  rx="2"
                  fill={graph.color}
                >
                  <animate
                    attributeName="width"
                    from="0"
                    to={widthValue.toFixed(3)}
                    dur="1.2s"
                    begin={`${(index * 0.08).toFixed(2)}s`}
                    fill="freeze"
                  />
                </rect>
              </g>
            );
          })}
        </svg>
      );
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={graph.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.slice(0, 20).map((item, index) => (
          <circle
            key={`${graph.key}-point-${index}`}
            cx={toX(index, Math.min(20, points.length))}
            cy={toY(item.value)}
            r="1.1"
            fill={graph.accent}
          />
        ))}
      </svg>
    );
  }, []);

  const getAxisProfile = React.useCallback((graph: QuickGraph): AxisProfile => {
    if (
      graph.chartType === "stacked-bar-100-chart" ||
      graph.chartType === "gauge-chart"
    ) {
      return {
        xLabel: "Category",
        yLabel: "Percentage",
        unit: "percent",
        scale: "normalized 0-100",
      };
    }

    if (
      [
        "bar-chart",
        "horizontal-bar-chart",
        "grouped-bar-chart",
        "stacked-bar-chart",
        "histogram",
        "treemap",
        "funnel-chart",
        "tree-diagram",
        "dendrogram",
        "sunburst-chart",
        "icicle-chart",
        "sankey-diagram",
        "chord-diagram",
        "network-graph",
        "animated-bar-race-chart",
      ].includes(graph.chartType)
    ) {
      return {
        xLabel: "Category",
        yLabel: "Count",
        unit: "count",
        scale: "linear",
      };
    }

    if (
      [
        "time-series-rolling-average",
        "candlestick-chart",
        "ohlc-chart",
        "calendar-heatmap",
        "step-chart",
      ].includes(graph.chartType)
    ) {
      return {
        xLabel: "Time",
        yLabel: "Index score",
        unit: "score",
        scale: "indexed",
      };
    }

    if (
      [
        "scatter-plot",
        "bubble-chart",
        "hexbin-plot",
        "pair-plot",
        "correlation-heatmap",
        "scatter-3d",
        "parallel-coordinates-plot",
      ].includes(graph.chartType)
    ) {
      return {
        xLabel: "Metric X",
        yLabel: "Metric Y",
        unit: "score",
        scale: "linear",
      };
    }

    return {
      xLabel: "Dimension",
      yLabel: "Score",
      unit: "score",
      scale: "linear",
    };
  }, []);

  const formatAxisValue = React.useCallback(
    (value: number | string, unit: AxisUnit) => {
      const numeric = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(numeric)) {
        return String(value);
      }

      if (unit === "percent") {
        return `${numeric.toFixed(0)}%`;
      }

      if (unit === "count") {
        return `${Math.round(numeric)}`;
      }

      if (Math.abs(numeric) >= 100) {
        return `${numeric.toFixed(0)}`;
      }

      return `${numeric.toFixed(1)}`;
    },
    [],
  );

  const renderGraphVisualization = React.useCallback(
    (graph: QuickGraph, isFullscreen: boolean) => {
      const axisProfile = getAxisProfile(graph);
      const commonMargin = { top: 12, right: 12, left: 8, bottom: 4 };
      const axisProps = {
        tickLine: false,
        axisLine: false,
        minTickGap: 24,
        tick: { fontSize: 11, fill: "#475569" },
      };
      const xAxisProps = {
        ...axisProps,
        tickFormatter: (value: string | number) => {
          const text = String(value ?? "");
          return text.length > 14 ? `${text.slice(0, 12)}..` : text;
        },
      };
      const yAxisProps = {
        ...axisProps,
        tickFormatter: (value: string | number) =>
          formatAxisValue(value, axisProfile.unit),
      };

      if (graph.chartType === "line-chart") {
        return (
          <LineChart data={graph.data} margin={commonMargin}>
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis dataKey="label" hide={false} {...xAxisProps} />
            <YAxis hide={false} {...yAxisProps} />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={graph.color}
              strokeWidth={2.6}
              dot={isFullscreen}
            />
          </LineChart>
        );
      }

      if (graph.chartType === "multi-line-chart") {
        return (
          <LineChart data={graph.data} margin={commonMargin}>
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis dataKey="label" hide={false} {...xAxisProps} />
            <YAxis hide={false} {...yAxisProps} />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name="Series A"
              stroke={graph.color}
              strokeWidth={2.2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="value2"
              name="Series B"
              stroke={graph.accent}
              strokeWidth={2.2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="value3"
              name="Series C"
              stroke="#0f766e"
              strokeWidth={2.2}
              dot={false}
            />
          </LineChart>
        );
      }

      if (graph.chartType === "area-chart") {
        return (
          <AreaChart data={graph.data} margin={commonMargin}>
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis dataKey="label" hide={false} {...xAxisProps} />
            <YAxis hide={false} {...yAxisProps} />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={graph.color}
              fill={graph.color}
              fillOpacity={0.28}
            />
          </AreaChart>
        );
      }

      if (
        graph.chartType === "stacked-area-chart" ||
        graph.chartType === "stream-graph"
      ) {
        return (
          <AreaChart
            data={graph.data}
            margin={commonMargin}
            stackOffset={
              graph.chartType === "stream-graph" ? "silhouette" : "none"
            }
          >
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis dataKey="label" hide={false} {...xAxisProps} />
            <YAxis hide={false} {...yAxisProps} />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Legend />
            <Area
              type="monotone"
              dataKey="value"
              name="Series A"
              stackId="s"
              stroke={graph.color}
              fill={graph.color}
              fillOpacity={0.26}
            />
            <Area
              type="monotone"
              dataKey="value2"
              name="Series B"
              stackId="s"
              stroke={graph.accent}
              fill={graph.accent}
              fillOpacity={0.22}
            />
            <Area
              type="monotone"
              dataKey="value3"
              name="Series C"
              stackId="s"
              stroke="#0f766e"
              fill="#0f766e"
              fillOpacity={0.2}
            />
          </AreaChart>
        );
      }

      if (graph.chartType === "bar-chart" || graph.chartType === "histogram") {
        return (
          <BarChart data={graph.data} margin={commonMargin}>
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis dataKey="label" hide={false} {...xAxisProps} />
            <YAxis hide={false} {...yAxisProps} />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Bar dataKey="value" fill={graph.color} radius={[8, 8, 2, 2]} />
          </BarChart>
        );
      }

      if (graph.chartType === "horizontal-bar-chart") {
        return (
          <BarChart data={graph.data} layout="vertical" margin={commonMargin}>
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis type="number" hide={false} {...yAxisProps} />
            <YAxis
              type="category"
              dataKey="label"
              hide={false}
              {...xAxisProps}
            />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Bar dataKey="value" fill={graph.color} radius={[2, 8, 8, 2]} />
          </BarChart>
        );
      }

      if (graph.chartType === "grouped-bar-chart") {
        return (
          <BarChart data={graph.data} margin={commonMargin}>
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis dataKey="label" hide={false} {...xAxisProps} />
            <YAxis hide={false} {...yAxisProps} />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Legend />
            <Bar
              dataKey="value"
              name="Series A"
              fill={graph.color}
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="value2"
              name="Series B"
              fill={graph.accent}
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="value3"
              name="Series C"
              fill="#0f766e"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        );
      }

      if (
        graph.chartType === "stacked-bar-chart" ||
        graph.chartType === "stacked-bar-100-chart"
      ) {
        return (
          <BarChart data={graph.data} margin={commonMargin}>
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis dataKey="label" hide={false} {...xAxisProps} />
            <YAxis
              hide={false}
              domain={
                graph.chartType === "stacked-bar-100-chart"
                  ? [0, 100]
                  : undefined
              }
              {...yAxisProps}
            />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Legend />
            <Bar
              dataKey="value"
              name="Series A"
              stackId="s"
              fill={graph.color}
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="value2"
              name="Series B"
              stackId="s"
              fill={graph.accent}
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="value3"
              name="Series C"
              stackId="s"
              fill="#0f766e"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        );
      }

      if (graph.chartType === "scatter-plot") {
        return (
          <ScatterChart margin={commonMargin}>
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis type="number" dataKey="value" hide={false} {...xAxisProps} />
            <YAxis
              type="number"
              dataKey="value2"
              hide={false}
              {...yAxisProps}
            />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Scatter data={graph.data} fill={graph.color} />
          </ScatterChart>
        );
      }

      if (graph.chartType === "bubble-chart") {
        return (
          <ScatterChart margin={commonMargin}>
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis type="number" dataKey="x" hide={false} {...xAxisProps} />
            <YAxis type="number" dataKey="y" hide={false} {...yAxisProps} />
            <ZAxis type="number" dataKey="size" range={[60, 360]} />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Scatter data={graph.data} fill={graph.color} fillOpacity={0.7} />
          </ScatterChart>
        );
      }

      if (graph.chartType === "time-series-rolling-average") {
        return (
          <LineChart data={graph.data} margin={commonMargin}>
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis dataKey="label" hide={false} {...xAxisProps} />
            <YAxis hide={false} {...yAxisProps} />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name="Actual"
              stroke={graph.color}
              strokeWidth={2.3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="value2"
              name="Rolling Avg"
              stroke={graph.accent}
              strokeWidth={2.6}
              dot={false}
            />
          </LineChart>
        );
      }

      if (graph.chartType === "step-chart") {
        return (
          <LineChart data={graph.data} margin={commonMargin}>
            <CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" />
            <XAxis dataKey="label" hide={false} {...xAxisProps} />
            <YAxis hide={false} {...yAxisProps} />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Line
              type="stepAfter"
              dataKey="value"
              stroke={graph.color}
              strokeWidth={2.6}
              dot={false}
            />
          </LineChart>
        );
      }

      if (graph.chartType === "radar-chart") {
        const radarData = graph.data.slice(0, 8).map((item) => ({
          label: item.label,
          a: item.value,
          b: item.value2,
        }));

        return (
          <RadarChart
            data={radarData}
            outerRadius={isFullscreen ? "74%" : "66%"}
          >
            <PolarGrid />
            <PolarAngleAxis
              dataKey="label"
              tick={isFullscreen ? undefined : false}
            />
            <PolarRadiusAxis tick={false} />
            <Tooltip contentStyle={tooltipContentStyle} />
            <Radar
              dataKey="a"
              stroke={graph.color}
              fill={graph.color}
              fillOpacity={0.24}
            />
            <Radar
              dataKey="b"
              stroke={graph.accent}
              fill={graph.accent}
              fillOpacity={0.18}
            />
          </RadarChart>
        );
      }

      if (graph.chartType === "funnel-chart") {
        const funnelData = graph.data.slice(0, 8).map((item) => ({
          name: item.label,
          value: Math.max(1, Math.round(item.value)),
        }));
        return (
          <FunnelChart>
            <Tooltip contentStyle={tooltipContentStyle} />
            <Funnel
              dataKey="value"
              data={funnelData}
              isAnimationActive
              fill={graph.color}
            />
          </FunnelChart>
        );
      }

      if (graph.chartType === "treemap") {
        const treeData = graph.data.slice(0, 12).map((item) => ({
          name: item.label,
          size: Math.max(1, Math.round(item.value + item.value2)),
        }));
        return (
          <Treemap
            data={treeData}
            dataKey="size"
            stroke="#ffffff"
            fill={graph.color}
          />
        );
      }

      if (graph.chartType === "gauge-chart") {
        const gaugeValue = Math.max(
          0,
          Math.min(100, graph.data[0]?.value || 0),
        );
        const gaugeData = [
          { name: "value", value: gaugeValue },
          { name: "rest", value: 100 - gaugeValue },
        ];
        return (
          <PieChart>
            <Pie
              data={gaugeData}
              dataKey="value"
              startAngle={180}
              endAngle={0}
              cx="50%"
              cy="72%"
              innerRadius={isFullscreen ? 88 : 50}
              outerRadius={isFullscreen ? 120 : 72}
              stroke="none"
            >
              <Cell fill={graph.color} />
              <Cell fill="#e2e8f0" />
            </Pie>
            <Tooltip contentStyle={tooltipContentStyle} />
          </PieChart>
        );
      }

      return renderSvgGraph(graph);
    },
    [formatAxisValue, getAxisProfile, renderSvgGraph, tooltipContentStyle],
  );

  const getAxisDescriptor = React.useCallback(
    (graph: QuickGraph) => {
      const axis = getAxisProfile(graph);
      const unitText = axis.unit === "percent" ? "%" : axis.unit;
      return `X-axis: ${axis.xLabel} | Y-axis: ${axis.yLabel} (${unitText}) | Scale: ${axis.scale}`;
    },
    [getAxisProfile],
  );

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
      const normalized = rows
        .filter((row) => row && row.id !== undefined && row.id !== null)
        .map((row, index) => ({
          ...row,
          cleanedFileName:
            row.cleanedFileName ||
            row.originalFileName ||
            `stored-file-${index + 1}`,
          fileFormat: row.fileFormat || "csv",
          downloadUrl: row.downloadUrl || "",
        }))
        .sort((a, b) => {
          const aTime = Date.parse(a.createdAt || "");
          const bTime = Date.parse(b.createdAt || "");
          return (
            (Number.isFinite(bTime) ? bTime : 0) -
            (Number.isFinite(aTime) ? aTime : 0)
          );
        });

      setStoredFiles(normalized);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load cleaned files"));
    } finally {
      setIsFilesLoading(false);
    }
  }, [allowed]);

  React.useEffect(() => {
    reloadStoredFiles();
  }, [reloadStoredFiles]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onFocus = () => {
      reloadStoredFiles();
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        reloadStoredFiles();
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "gttc:cleaned-files:updated") {
        reloadStoredFiles();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
    };
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

    try {
      const { blob, outputName, file } = await buildOutputFile(
        cleanedRows,
        format,
        fileName || "dataset",
      );

      triggerDownload(blob, outputName);

      await api.uploadCleanedDataFile({
        file,
        originalFileName: fileName || "dataset",
        format,
        sendEmail: false,
      });

      await reloadStoredFiles();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "gttc:cleaned-files:updated",
          String(Date.now()),
        );
      }
      toast.success(`Downloaded and stored ${outputName} for 30 minutes`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to download cleaned file"));
    }
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
        sendEmail: true,
      });

      if (uploaded.emailSent) {
        toast.success("Cleaned file emailed and stored for 30 minutes");
      } else {
        toast.success(
          "File stored for 30 minutes. If email is delayed, use the stored files list below.",
        );
      }
      await reloadStoredFiles();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "gttc:cleaned-files:updated",
          String(Date.now()),
        );
      }
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

  const handleDownloadStoredFile = async (item: DataAnalysisStoredFile) => {
    if (!item.downloadUrl) {
      toast.error("Download link is unavailable for this stored file");
      return;
    }

    const id = String(item.id);
    setActiveStoredFileId(id);
    try {
      const downloaded = await api.downloadProtectedFile(item.downloadUrl);
      const fileName = downloaded.fileName || item.cleanedFileName;
      triggerDownload(downloaded.blob, fileName);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to download stored file"));
    } finally {
      setActiveStoredFileId(null);
    }
  };

  const handleViewStoredOutput = async (item: DataAnalysisStoredFile) => {
    if (!item.downloadUrl) {
      toast.error("Preview link is unavailable for this stored file");
      return;
    }

    const id = String(item.id);
    const format = (item.fileFormat || "").toLowerCase();
    if (!format || !["csv", "xlsx", "xls"].includes(format)) {
      toast.error("Preview is supported for CSV and Excel files only");
      return;
    }

    setActiveStoredFileId(id);
    try {
      const downloaded = await api.downloadProtectedFile(item.downloadUrl);
      const fileName = downloaded.fileName || item.cleanedFileName;
      const file = new File([downloaded.blob], fileName, {
        type:
          downloaded.contentType ||
          downloaded.blob.type ||
          "application/octet-stream",
      });

      await loadDatasetFile(file, "Loaded stored output preview");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to preview stored output"));
    } finally {
      setActiveStoredFileId(null);
    }
  };

  const handleExpandGraph = async (
    event: React.MouseEvent<HTMLDivElement>,
    graphKey: string,
  ) => {
    type FullscreenDocument = Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };

    if (fullscreenGraphKey === graphKey && document.fullscreenElement) {
      const fullDoc = document as FullscreenDocument;
      const exitFullscreen =
        document.exitFullscreen ||
        fullDoc.webkitExitFullscreen ||
        fullDoc.msExitFullscreen;

      if (exitFullscreen) {
        const exitResult = exitFullscreen.call(document);
        if (
          exitResult &&
          typeof exitResult === "object" &&
          "then" in exitResult &&
          typeof exitResult.then === "function"
        ) {
          await exitResult;
        }
      }

      setFullscreenGraphKey(null);
      return;
    }

    type FullscreenTarget = HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };

    const target = event.currentTarget as FullscreenTarget;
    const requestFullscreen =
      target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.msRequestFullscreen;

    if (!requestFullscreen) {
      toast.error("Fullscreen is not supported in this browser");
      return;
    }

    try {
      setFullscreenGraphKey(graphKey);
      const outcome = requestFullscreen.call(target);
      if (
        outcome &&
        typeof outcome === "object" &&
        "then" in outcome &&
        typeof outcome.then === "function"
      ) {
        await outcome;
      }
    } catch (error) {
      setFullscreenGraphKey((current) =>
        current === graphKey ? null : current,
      );
      toast.error(getErrorMessage(error, "Unable to open fullscreen graph"));
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

          <Card className="border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-sky-100/60 shadow-[0_16px_60px_-36px_rgba(14,165,233,0.55)]">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">
                Insights Graph Studio
              </CardTitle>
              <p className="text-xs text-slate-600">
                50 eye-catching graphs generated from your dataset. Double-click
                any card to open fullscreen, and double-click again or press Esc
                to close.
              </p>
            </CardHeader>
            <CardContent>
              {quickGraphGallery.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Add at least one numeric column to generate visual insights.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {quickGraphGallery.map((graph, graphIndex) => {
                    const isFullscreen = fullscreenGraphKey === graph.key;
                    const axisProfile = getAxisProfile(graph);
                    const graphSurface =
                      GRAPH_CARD_BACKGROUNDS[
                        graphIndex % GRAPH_CARD_BACKGROUNDS.length
                      ];

                    return (
                      <div
                        key={graph.key}
                        className={
                          isFullscreen
                            ? "h-screen w-screen cursor-zoom-out overflow-auto rounded-none border-0 bg-white p-6 text-slate-900 shadow-none"
                            : `group cursor-zoom-in rounded-2xl border border-slate-200/80 bg-gradient-to-br ${graphSurface} p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`
                        }
                        style={
                          isFullscreen
                            ? undefined
                            : {
                                opacity: showGraphCards ? 1 : 0,
                                transform: showGraphCards
                                  ? "translateY(0px) scale(1)"
                                  : "translateY(10px) scale(0.985)",
                                transitionProperty:
                                  "opacity, transform, box-shadow",
                                transitionDuration: "420ms",
                                transitionTimingFunction:
                                  "cubic-bezier(0.2, 0.8, 0.2, 1)",
                                transitionDelay: `${Math.min(graphIndex * 28, 800)}ms`,
                              }
                        }
                        onDoubleClick={(event) =>
                          handleExpandGraph(event, graph.key)
                        }
                        title="Double-click to expand fullscreen"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <p
                            className={`text-sm font-semibold leading-snug ${
                              isFullscreen ? "text-slate-900" : "text-slate-800"
                            }`}
                          >
                            {graph.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                isFullscreen
                                  ? "border-slate-300 text-slate-700"
                                  : "border-slate-300/70 bg-white/70 text-slate-700"
                              }
                            >
                              {graph.family}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                isFullscreen
                                  ? "border-slate-300 text-slate-700"
                                  : "border-slate-300/70 bg-white/70 text-slate-700"
                              }
                            >
                              {axisProfile.unit}
                            </Badge>
                          </div>
                        </div>
                        <div
                          className={
                            isFullscreen
                              ? "h-[82vh] rounded-2xl border border-slate-200 bg-white p-3"
                              : "h-[210px] rounded-xl border border-white/70 bg-white/85 p-2"
                          }
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            {renderGraphVisualization(graph, isFullscreen)}
                          </ResponsiveContainer>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500">
                          {getAxisDescriptor(graph)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

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
        </>
      ) : null}

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Temporary Stored Cleaned Files (30 min)
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={reloadStoredFiles}
            disabled={isFilesLoading}
          >
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
            <div className="rounded-lg border border-dashed border-border/50 bg-muted/20 p-3">
              <p className="text-sm text-muted-foreground">
                No cleaned files are visible right now.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Files are account-specific and auto-expire after 30 minutes. Use
                Refresh after you email/export a file.
              </p>
            </div>
          ) : null}

          {storedFiles.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border border-border/40 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-left font-medium text-foreground"
                  onClick={() => handleViewStoredOutput(item)}
                  disabled={
                    activeStoredFileId === String(item.id) || !item.downloadUrl
                  }
                >
                  {item.cleanedFileName}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Original: {item.originalFileName} • Created:{" "}
                  {toIsoDate(item.createdAt)} • Expires:{" "}
                  {toIsoDate(item.expiresAt)}
                </p>
                {!item.downloadUrl ? (
                  <p className="mt-1 text-xs text-amber-600">
                    Download link is not available for this item yet.
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewStoredOutput(item)}
                  disabled={
                    activeStoredFileId === String(item.id) || !item.downloadUrl
                  }
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  {activeStoredFileId === String(item.id)
                    ? "Opening..."
                    : "View Output"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadStoredFile(item)}
                  disabled={
                    activeStoredFileId === String(item.id) || !item.downloadUrl
                  }
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteStoredFile(item.id)}
                  disabled={activeStoredFileId === String(item.id)}
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
