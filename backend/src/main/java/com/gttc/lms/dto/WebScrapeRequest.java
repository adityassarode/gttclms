package com.gttc.lms.dto;

import jakarta.validation.constraints.NotBlank;

public class WebScrapeRequest {
    @NotBlank(message = "URL is required")
    private String url;

    private Boolean includeTitle = true;
    private Boolean includeHeadings = true;
    private Boolean includeParagraphs = true;
    private Boolean includeLinks = true;
    private Boolean includeTables = true;

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public boolean isIncludeTitle() {
        return includeTitle == null || includeTitle;
    }

    public void setIncludeTitle(Boolean includeTitle) {
        this.includeTitle = includeTitle;
    }

    public boolean isIncludeHeadings() {
        return includeHeadings == null || includeHeadings;
    }

    public void setIncludeHeadings(Boolean includeHeadings) {
        this.includeHeadings = includeHeadings;
    }

    public boolean isIncludeParagraphs() {
        return includeParagraphs == null || includeParagraphs;
    }

    public void setIncludeParagraphs(Boolean includeParagraphs) {
        this.includeParagraphs = includeParagraphs;
    }

    public boolean isIncludeLinks() {
        return includeLinks == null || includeLinks;
    }

    public void setIncludeLinks(Boolean includeLinks) {
        this.includeLinks = includeLinks;
    }

    public boolean isIncludeTables() {
        return includeTables == null || includeTables;
    }

    public void setIncludeTables(Boolean includeTables) {
        this.includeTables = includeTables;
    }
}
