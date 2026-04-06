package com.gttc.lms.service;

import com.gttc.lms.dto.DataAnalysisFileResponse;
import com.gttc.lms.dto.WebScrapeExportRequest;
import com.gttc.lms.dto.WebScrapeResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.User;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class WebScrapeExportService {
    private static final float PDF_MARGIN = 48f;
    private static final float PDF_FONT_SIZE = 11f;
    private static final float PDF_LINE_HEIGHT = 15f;

    private final DataAnalysisFileService dataAnalysisFileService;

    public WebScrapeExportService(DataAnalysisFileService dataAnalysisFileService) {
        this.dataAnalysisFileService = dataAnalysisFileService;
    }

    public DataAnalysisFileResponse export(User user, WebScrapeExportRequest request, String requestBaseUrl) {
        String format = normalizeFormat(request.getFormat());
        String originalFileName = normalizeBaseName(request.getFileName()) + "." + format;
        boolean sendEmail = request.isSendEmail();

        byte[] output;
        try {
            output = "docx".equals(format) ? buildDocx(request) : buildPdf(request);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to build export file");
        }

        return dataAnalysisFileService.storeGeneratedFile(user, output, originalFileName, format, requestBaseUrl, sendEmail);
    }

    private String normalizeFormat(String value) {
        if (value == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Format is required");
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (!"pdf".equals(normalized) && !"docx".equals(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Format must be pdf or docx");
        }

        return normalized;
    }

    private String normalizeBaseName(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return "scraped-data";
        }

        String cleaned = normalized
                .replaceAll("\\\\", " ")
                .replaceAll("/", " ")
                .replaceAll("\\.+$", "")
                .replaceAll("\\s+", " ")
                .trim();

        return cleaned.isEmpty() ? "scraped-data" : cleaned;
    }

    private byte[] buildDocx(WebScrapeExportRequest request) throws IOException {
        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            addDocTitle(document, trimToNull(request.getTitle()) == null ? "Scraped Website Data" : request.getTitle());

            addDocSection(document, "Source URL", List.of(defaultText(request.getUrl(), "Not provided")));
            addDocSection(document, "Headings", ensureTextList(request.getHeadings()));
            addDocSection(document, "Paragraphs", ensureTextList(request.getParagraphs()));

            List<String> links = new ArrayList<>();
            if (request.getLinks() != null) {
                for (WebScrapeResponse.LinkItem link : request.getLinks()) {
                    if (link == null) {
                        continue;
                    }
                    String text = trimToNull(link.getText()) == null ? "Untitled" : link.getText().trim();
                    String url = trimToNull(link.getUrl()) == null ? "" : link.getUrl().trim();
                    links.add(text + (url.isEmpty() ? "" : " -> " + url));
                }
            }
            addDocSection(document, "Links", links);

            List<String> tableLines = buildTableLines(request.getTables());
            addDocSection(document, "Tables", tableLines);

            document.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    private void addDocTitle(XWPFDocument document, String value) {
        XWPFParagraph paragraph = document.createParagraph();
        XWPFRun run = paragraph.createRun();
        run.setBold(true);
        run.setFontSize(18);
        run.setText(value);
    }

    private void addDocSection(XWPFDocument document, String title, List<String> lines) {
        XWPFParagraph headingParagraph = document.createParagraph();
        XWPFRun headingRun = headingParagraph.createRun();
        headingRun.setBold(true);
        headingRun.setFontSize(13);
        headingRun.setText(title);

        List<String> safeLines = lines == null || lines.isEmpty() ? List.of("No data") : lines;
        for (String line : safeLines) {
            XWPFParagraph p = document.createParagraph();
            XWPFRun run = p.createRun();
            run.setFontSize(11);
            run.setText(defaultText(line, "No data"));
        }
    }

    private byte[] buildPdf(WebScrapeExportRequest request) throws IOException {
        List<PdfLine> lines = buildPdfLines(request);

        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            float y = page.getMediaBox().getHeight() - PDF_MARGIN;
            float maxWidth = page.getMediaBox().getWidth() - (PDF_MARGIN * 2);

            PDPageContentStream stream = new PDPageContentStream(document, page);
            try {
                for (PdfLine line : lines) {
                    PDType1Font font = line.heading ? PDType1Font.HELVETICA_BOLD : PDType1Font.HELVETICA;
                    float size = line.heading ? 13f : PDF_FONT_SIZE;
                    List<String> wrapped = wrapText(defaultText(line.text, ""), font, size, maxWidth);

                    for (String wrappedLine : wrapped) {
                        if (y < PDF_MARGIN + PDF_LINE_HEIGHT) {
                            stream.close();
                            page = new PDPage(PDRectangle.A4);
                            document.addPage(page);
                            stream = new PDPageContentStream(document, page);
                            y = page.getMediaBox().getHeight() - PDF_MARGIN;
                        }

                        stream.beginText();
                        stream.setFont(font, size);
                        stream.newLineAtOffset(PDF_MARGIN, y);
                        stream.showText(wrappedLine);
                        stream.endText();
                        y -= PDF_LINE_HEIGHT;
                    }

                    y -= 2f;
                }
            } finally {
                stream.close();
            }

            document.save(outputStream);
            return outputStream.toByteArray();
        }
    }

    private List<PdfLine> buildPdfLines(WebScrapeExportRequest request) {
        List<PdfLine> lines = new ArrayList<>();
        lines.add(new PdfLine("Scraped Website Data", true));
        lines.add(new PdfLine("Source URL: " + defaultText(request.getUrl(), "Not provided"), false));

        appendPdfSection(lines, "Headings", ensureTextList(request.getHeadings()));
        appendPdfSection(lines, "Paragraphs", ensureTextList(request.getParagraphs()));

        List<String> links = new ArrayList<>();
        if (request.getLinks() != null) {
            for (WebScrapeResponse.LinkItem link : request.getLinks()) {
                if (link == null) {
                    continue;
                }
                String text = trimToNull(link.getText()) == null ? "Untitled" : link.getText().trim();
                String url = trimToNull(link.getUrl()) == null ? "" : link.getUrl().trim();
                links.add(text + (url.isEmpty() ? "" : " -> " + url));
            }
        }
        appendPdfSection(lines, "Links", links);

        appendPdfSection(lines, "Tables", buildTableLines(request.getTables()));
        return lines;
    }

    private void appendPdfSection(List<PdfLine> lines, String heading, List<String> values) {
        lines.add(new PdfLine(heading, true));
        List<String> safeValues = (values == null || values.isEmpty()) ? List.of("No data") : values;
        for (String value : safeValues) {
            lines.add(new PdfLine("- " + defaultText(value, "No data"), false));
        }
    }

    private static final class PdfLine {
        private final String text;
        private final boolean heading;

        private PdfLine(String text, boolean heading) {
            this.text = text;
            this.heading = heading;
        }
    }

    private List<String> wrapText(String input, PDType1Font font, float fontSize, float maxWidth) throws IOException {
        String value = defaultText(input, "");
        if (value.isBlank()) {
            return List.of("");
        }

        List<String> wrapped = new ArrayList<>();
        String[] paragraphs = value.split("\\r?\\n");
        for (String paragraph : paragraphs) {
            String[] words = paragraph.split("\\s+");
            StringBuilder line = new StringBuilder();
            for (String word : words) {
                String candidate = line.isEmpty() ? word : line + " " + word;
                float candidateWidth = font.getStringWidth(candidate) / 1000f * fontSize;
                if (candidateWidth <= maxWidth) {
                    line.setLength(0);
                    line.append(candidate);
                } else {
                    if (!line.isEmpty()) {
                        wrapped.add(line.toString());
                    }
                    line.setLength(0);
                    line.append(word);
                }
            }
            if (!line.isEmpty()) {
                wrapped.add(line.toString());
            }
            if (paragraph.isBlank()) {
                wrapped.add("");
            }
        }

        return wrapped.isEmpty() ? List.of("") : wrapped;
    }

    private List<String> buildTableLines(List<WebScrapeResponse.TableItem> tables) {
        List<String> lines = new ArrayList<>();

        if (tables == null || tables.isEmpty()) {
            return lines;
        }

        int tableNumber = 1;
        for (WebScrapeResponse.TableItem table : tables) {
            if (table == null) {
                continue;
            }

            lines.add("Table " + tableNumber);
            tableNumber++;

            List<String> headers = table.getHeaders() == null ? List.of() : table.getHeaders();
            if (!headers.isEmpty()) {
                lines.add("Headers: " + String.join(" | ", headers));
            }

            List<List<String>> rows = table.getRows() == null ? List.of() : table.getRows();
            int rowIndex = 1;
            for (List<String> row : rows) {
                if (row == null || row.isEmpty()) {
                    continue;
                }
                lines.add("Row " + rowIndex + ": " + String.join(" | ", row));
                rowIndex++;
            }
        }

        return lines;
    }

    private List<String> ensureTextList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }

        List<String> output = new ArrayList<>();
        for (String value : values) {
            String trimmed = trimToNull(value);
            if (trimmed != null) {
                output.add(trimmed);
            }
        }
        return output;
    }

    private String defaultText(String value, String fallback) {
        String trimmed = trimToNull(value);
        return trimmed == null ? fallback : trimmed;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}