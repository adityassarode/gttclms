"use client";

import * as React from "react";
import {
  Globe,
  Download,
  Link2,
  Table2,
  FileText,
  Loader2,
  Mail,
  Sparkles,
  ListOrdered,
  AlignLeft,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useProtectedPage } from "@/lib/route-guards";
import type { WebScrapeResponse, WebScrapeTableItem } from "@/lib/types";
import { getErrorMessage } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");
  const needsQuote =
    text.includes(",") || text.includes('"') || text.includes("\n");
  const escaped = text.replaceAll('"', '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function downloadTableAsCsv(table: WebScrapeTableItem, fileName: string) {
  const lines: string[] = [];

  if (table.headers.length) {
    lines.push(table.headers.map((cell) => escapeCsvCell(cell)).join(","));
  }

  table.rows.forEach((row) => {
    lines.push(row.map((cell) => escapeCsvCell(cell)).join(","));
  });

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function trimToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function baseNameFromUrl(inputUrl: string) {
  try {
    const parsed = new URL(inputUrl);
    const host = parsed.hostname.replace(/^www\./, "").split(".")[0] || "scraped-data";
    return host;
  } catch {
    return "scraped-data";
  }
}

function toSafeBaseName(value: string) {
  const normalized = value
    .replace(/[\\/]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "")
    .trim();
  return normalized || "scraped-data";
}

function buildSuggestedName(result: WebScrapeResponse) {
  const preferred = trimToNull(result.title ?? "") || baseNameFromUrl(result.url);
  return toSafeBaseName(preferred);
}

export default function WebScrapingPage() {
  const allowed = useProtectedPage();

  const [url, setUrl] = React.useState("");
  const [includeTitle, setIncludeTitle] = React.useState(true);
  const [includeHeadings, setIncludeHeadings] = React.useState(true);
  const [includeParagraphs, setIncludeParagraphs] = React.useState(true);
  const [includeLinks, setIncludeLinks] = React.useState(true);
  const [includeTables, setIncludeTables] = React.useState(true);

  const [result, setResult] = React.useState<WebScrapeResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<"pdf" | "docx">("pdf");
  const [exportFileName, setExportFileName] = React.useState("scraped-data");

  const stats = React.useMemo(() => {
    if (!result) {
      return {
        headingCount: 0,
        paragraphCount: 0,
        linkCount: 0,
        tableCount: 0,
      };
    }

    return {
      headingCount: result.headings.length,
      paragraphCount: result.paragraphs.length,
      linkCount: result.links.length,
      tableCount: result.tables.length,
    };
  }, [result]);

  const handleScrape = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!url.trim()) {
      toast.error("Enter a website URL");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.scrapeWebsite({
        url: url.trim(),
        includeTitle,
        includeHeadings,
        includeParagraphs,
        includeLinks,
        includeTables,
      });

      setResult(response);
      setExportFileName(buildSuggestedName(response));
      toast.success("Scraping complete");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to scrape URL"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportAndEmail = async () => {
    if (!result) {
      toast.error("Scrape a website first");
      return;
    }

    const safeFileName = trimToNull(exportFileName);
    if (!safeFileName) {
      toast.error("Enter a filename");
      return;
    }

    setIsExporting(true);
    try {
      const stored = await api.exportScrapedFile({
        fileName: safeFileName,
        format: exportFormat,
        url: result.url,
        title: result.title,
        headings: result.headings,
        paragraphs: result.paragraphs,
        links: result.links,
        tables: result.tables,
      });

      const anchor = document.createElement("a");
      anchor.href = stored.downloadUrl;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      if (stored.emailSent) {
        toast.success("Download started and email sent. Link expires in 30 minutes.");
      } else {
        toast.warning(
          "Download started. Email could not be sent, but your file link is active for 30 minutes.",
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to export scraped data"));
    } finally {
      setIsExporting(false);
    }
  };

  if (!allowed) {
    return <div className="py-8" />;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Smart scrape and export
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Web Scraping Studio
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Extract page content and export it as PDF or DOCX with automatic
            email delivery. Exported files are named with "- Aditya Sarode" and
            expire after 30 minutes.
          </p>
        </div>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            Extract Web Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScrape} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scrapeUrl">Website URL</Label>
              <Input
                id="scrapeUrl"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeTitle}
                  onChange={(event) => setIncludeTitle(event.target.checked)}
                />
                Title
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeHeadings}
                  onChange={(event) => setIncludeHeadings(event.target.checked)}
                />
                Headings
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeParagraphs}
                  onChange={(event) =>
                    setIncludeParagraphs(event.target.checked)
                  }
                />
                Paragraphs
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeLinks}
                  onChange={(event) => setIncludeLinks(event.target.checked)}
                />
                Links
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeTables}
                  onChange={(event) => setIncludeTables(event.target.checked)}
                />
                Tables
              </label>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Extract Data
            </Button>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Headings
                </p>
                <p className="mt-1 text-2xl font-semibold">{stats.headingCount}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Paragraphs
                </p>
                <p className="mt-1 text-2xl font-semibold">{stats.paragraphCount}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Links
                </p>
                <p className="mt-1 text-2xl font-semibold">{stats.linkCount}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tables
                </p>
                <p className="mt-1 text-2xl font-semibold">{stats.tableCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5" />
                Export and Email (30 min expiry)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="exportFileName">File Name</Label>
                  <Input
                    id="exportFileName"
                    value={exportFileName}
                    onChange={(event) => setExportFileName(event.target.value)}
                    placeholder="scraped-data"
                  />
                  <p className="text-xs text-muted-foreground">
                    Saved as: {toSafeBaseName(exportFileName)} - Aditya Sarode.
                    {exportFormat}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={exportFormat === "pdf" ? "default" : "outline"}
                      onClick={() => setExportFormat("pdf")}
                      className="flex-1"
                    >
                      PDF
                    </Button>
                    <Button
                      type="button"
                      variant={exportFormat === "docx" ? "default" : "outline"}
                      onClick={() => setExportFormat("docx")}
                      className="flex-1"
                    >
                      DOCX
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleExportAndEmail}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download + Email {exportFormat.toUpperCase()}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Generated file link auto-expires in 30 minutes.
                </p>
              </div>
            </CardContent>
          </Card>

          {result.title ? (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Page Title
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{result.title}</p>
                <p className="mt-2 text-xs text-muted-foreground break-all">
                  Source: {result.url}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {result.headings.length > 0 ? (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ListOrdered className="h-5 w-5" />
                  Headings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.headings.map((heading, index) => (
                  <p
                    key={`${heading}-${index}`}
                    className="rounded-md border border-border/40 px-3 py-2 text-sm text-foreground"
                  >
                    {heading}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {result.paragraphs.length > 0 ? (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlignLeft className="h-5 w-5" />
                  Paragraphs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.paragraphs.slice(0, 25).map((paragraph, index) => (
                  <p
                    key={`${index}-${paragraph.slice(0, 20)}`}
                    className="text-sm leading-6 text-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
                {result.paragraphs.length > 25 ? (
                  <p className="text-xs text-muted-foreground">
                    Showing first 25 paragraphs out of {result.paragraphs.length}.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {result.links.length > 0 ? (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Link2 className="h-5 w-5" />
                  Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.links.slice(0, 120).map((link, index) => (
                    <a
                      key={`${link.url}-${index}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate rounded-md border border-border/40 px-3 py-2 text-sm text-foreground hover:bg-muted/20"
                      title={link.url}
                    >
                      {link.text}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {result.tables.length > 0 ? (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Table2 className="h-5 w-5" />
                  Tables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {result.tables.map((table, tableIndex) => (
                  <div
                    key={`table-${tableIndex}`}
                    className="space-y-3 rounded-lg border border-border/40 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        Table {tableIndex + 1}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          downloadTableAsCsv(
                            table,
                            `scraped-table-${tableIndex + 1}.csv`,
                          )
                        }
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download CSV
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-border/40 bg-muted/20">
                            {(table.headers.length
                              ? table.headers
                              : table.rows[0] || []
                            ).map((header, index) => (
                              <th
                                key={`${header}-${index}`}
                                className="px-3 py-3 text-left text-sm"
                              >
                                {header || `Column ${index + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.slice(0, 20).map((row, rowIndex) => (
                            <tr
                              key={`row-${tableIndex}-${rowIndex}`}
                              className="border-b border-border/30"
                            >
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={`cell-${tableIndex}-${rowIndex}-${cellIndex}`}
                                  className="px-3 py-3 text-sm"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {table.rows.length > 20 ? (
                      <p className="text-xs text-muted-foreground">
                        Showing first 20 rows out of {table.rows.length}.
                      </p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
