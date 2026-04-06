package com.gttc.lms.dto;

import java.util.ArrayList;
import java.util.List;

public class WebScrapeResponse {
    private String url;
    private String title;
    private List<String> headings = new ArrayList<>();
    private List<String> paragraphs = new ArrayList<>();
    private List<LinkItem> links = new ArrayList<>();
    private List<TableItem> tables = new ArrayList<>();

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public List<String> getHeadings() {
        return headings;
    }

    public void setHeadings(List<String> headings) {
        this.headings = headings;
    }

    public List<String> getParagraphs() {
        return paragraphs;
    }

    public void setParagraphs(List<String> paragraphs) {
        this.paragraphs = paragraphs;
    }

    public List<LinkItem> getLinks() {
        return links;
    }

    public void setLinks(List<LinkItem> links) {
        this.links = links;
    }

    public List<TableItem> getTables() {
        return tables;
    }

    public void setTables(List<TableItem> tables) {
        this.tables = tables;
    }

    public static class LinkItem {
        private String text;
        private String url;

        public LinkItem() {
        }

        public LinkItem(String text, String url) {
            this.text = text;
            this.url = url;
        }

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }
    }

    public static class TableItem {
        private List<String> headers = new ArrayList<>();
        private List<List<String>> rows = new ArrayList<>();

        public List<String> getHeaders() {
            return headers;
        }

        public void setHeaders(List<String> headers) {
            this.headers = headers;
        }

        public List<List<String>> getRows() {
            return rows;
        }

        public void setRows(List<List<String>> rows) {
            this.rows = rows;
        }
    }
}
