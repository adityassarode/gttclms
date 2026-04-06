package com.gttc.lms.service;

import com.gttc.lms.dto.WebScrapeRequest;
import com.gttc.lms.dto.WebScrapeResponse;
import com.gttc.lms.exception.ApiException;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class WebScrapeService {
    private static final int MAX_HEADINGS = 120;
    private static final int MAX_PARAGRAPHS = 200;
    private static final int MAX_LINKS = 250;
    private static final int MAX_TABLES = 20;
    private static final int MAX_TABLE_ROWS = 200;
    private static final int MAX_TABLE_COLUMNS = 30;

    public WebScrapeResponse extract(WebScrapeRequest request) {
        String normalizedUrl = normalizeUrl(request.getUrl());

        try {
            Document document = Jsoup.connect(normalizedUrl)
                    .userAgent("GTTC-LMS-WebScraper/1.0")
                    .timeout(15000)
                    .get();

            WebScrapeResponse response = new WebScrapeResponse();
            response.setUrl(normalizedUrl);

            if (request.isIncludeTitle()) {
                response.setTitle(trimToNull(document.title()));
            }

            if (request.isIncludeHeadings()) {
                response.setHeadings(extractTextList(document.select("h1, h2, h3, h4, h5, h6"), MAX_HEADINGS, true));
            }

            if (request.isIncludeParagraphs()) {
                response.setParagraphs(extractTextList(document.select("p"), MAX_PARAGRAPHS, false));
            }

            if (request.isIncludeLinks()) {
                response.setLinks(extractLinks(document));
            }

            if (request.isIncludeTables()) {
                response.setTables(extractTables(document));
            }

            return response;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to fetch URL. Ensure it is reachable and valid.");
        }
    }

    private List<String> extractTextList(Elements elements, int limit, boolean deduplicate) {
        List<String> output = new ArrayList<>();
        Set<String> seen = deduplicate ? new LinkedHashSet<>() : null;

        for (Element element : elements) {
            String text = trimToNull(element.text());
            if (text == null) {
                continue;
            }

            if (seen != null && !seen.add(text)) {
                continue;
            }

            output.add(text);
            if (output.size() >= limit) {
                break;
            }
        }

        return output;
    }

    private List<WebScrapeResponse.LinkItem> extractLinks(Document document) {
        List<WebScrapeResponse.LinkItem> links = new ArrayList<>();
        Set<String> seenUrls = new LinkedHashSet<>();

        for (Element anchor : document.select("a[href]")) {
            String href = trimToNull(anchor.absUrl("href"));
            if (href == null) {
                href = trimToNull(anchor.attr("href"));
            }
            if (href == null || !seenUrls.add(href)) {
                continue;
            }

            String text = trimToNull(anchor.text());
            if (text == null) {
                text = href;
            }

            links.add(new WebScrapeResponse.LinkItem(text, href));
            if (links.size() >= MAX_LINKS) {
                break;
            }
        }

        return links;
    }

    private List<WebScrapeResponse.TableItem> extractTables(Document document) {
        List<WebScrapeResponse.TableItem> tables = new ArrayList<>();
        Elements tableElements = document.select("table");

        int tableCount = 0;
        for (Element table : tableElements) {
            if (tableCount >= MAX_TABLES) {
                break;
            }

            List<String> headers = extractHeaders(table);
            List<List<String>> rows = extractRows(table, !headers.isEmpty());

            if (headers.isEmpty() && rows.isEmpty()) {
                continue;
            }

            WebScrapeResponse.TableItem item = new WebScrapeResponse.TableItem();
            item.setHeaders(headers);
            item.setRows(rows);
            tables.add(item);
            tableCount++;
        }

        return tables;
    }

    private List<String> extractHeaders(Element table) {
        Elements explicitHeaders = table.select("thead tr th");
        if (!explicitHeaders.isEmpty()) {
            return trimCellValues(explicitHeaders.eachText());
        }

        Element firstRow = table.selectFirst("tr");
        if (firstRow == null || firstRow.select("th").isEmpty()) {
            return List.of();
        }

        return trimCellValues(firstRow.select("th, td").eachText());
    }

    private List<List<String>> extractRows(Element table, boolean hasHeaders) {
        List<List<String>> rows = new ArrayList<>();
        Elements allRows = table.select("tr");
        int startIndex = hasHeaders ? 1 : 0;

        for (int rowIndex = startIndex; rowIndex < allRows.size(); rowIndex++) {
            Element row = allRows.get(rowIndex);
            Elements cells = row.select("th, td");
            if (cells.isEmpty()) {
                continue;
            }

            List<String> values = trimCellValues(cells.eachText());
            if (values.isEmpty()) {
                continue;
            }

            rows.add(values);
            if (rows.size() >= MAX_TABLE_ROWS) {
                break;
            }
        }

        return rows;
    }

    private List<String> trimCellValues(List<String> values) {
        List<String> output = new ArrayList<>();

        for (String value : values) {
            if (output.size() >= MAX_TABLE_COLUMNS) {
                break;
            }

            String normalized = trimToNull(value);
            if (normalized != null) {
                output.add(normalized);
            }
        }

        return output;
    }

    private String normalizeUrl(String rawUrl) {
        String value = trimToNull(rawUrl);
        if (value == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "URL is required");
        }

        String candidate = value;
        if (!candidate.matches("^[a-zA-Z][a-zA-Z0-9+.-]*://.*$")) {
            candidate = "https://" + candidate;
        }

        try {
            URI uri = new URI(candidate).normalize();
            String scheme = uri.getScheme();
            if (scheme == null ||
                    (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "URL must start with http:// or https://");
            }
            if (uri.getHost() == null || uri.getHost().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid URL");
            }
            return uri.toString();
        } catch (URISyntaxException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid URL");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
