package com.gttc.lms.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;

public class WebScrapeExportRequest {
    @NotBlank(message = "File name is required")
    private String fileName;

    @NotBlank(message = "Format is required")
    private String format;

    private String url;
    private String title;
    private List<String> headings = new ArrayList<>();
    private List<String> paragraphs = new ArrayList<>();
    private List<WebScrapeResponse.LinkItem> links = new ArrayList<>();
    private List<WebScrapeResponse.TableItem> tables = new ArrayList<>();
    private Boolean sendEmail;

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

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

    public List<WebScrapeResponse.LinkItem> getLinks() {
        return links;
    }

    public void setLinks(List<WebScrapeResponse.LinkItem> links) {
        this.links = links;
    }

    public List<WebScrapeResponse.TableItem> getTables() {
        return tables;
    }

    public void setTables(List<WebScrapeResponse.TableItem> tables) {
        this.tables = tables;
    }

    public boolean isSendEmail() {
        return sendEmail == null || sendEmail;
    }

    public void setSendEmail(Boolean sendEmail) {
        this.sendEmail = sendEmail;
    }
}