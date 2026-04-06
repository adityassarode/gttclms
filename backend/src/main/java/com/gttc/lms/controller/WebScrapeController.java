package com.gttc.lms.controller;

import com.gttc.lms.dto.DataAnalysisFileResponse;
import com.gttc.lms.dto.WebScrapeExportRequest;
import com.gttc.lms.dto.WebScrapeRequest;
import com.gttc.lms.dto.WebScrapeResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.WebScrapeExportService;
import com.gttc.lms.service.WebScrapeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/web-scrape")
public class WebScrapeController {
    private final WebScrapeService webScrapeService;
    private final WebScrapeExportService webScrapeExportService;
    private final CurrentUserResolver currentUserResolver;

    public WebScrapeController(
            WebScrapeService webScrapeService,
            WebScrapeExportService webScrapeExportService,
            CurrentUserResolver currentUserResolver
    ) {
        this.webScrapeService = webScrapeService;
        this.webScrapeExportService = webScrapeExportService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping("/extract")
    public WebScrapeResponse extract(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @Valid @RequestBody WebScrapeRequest request
    ) {
        // Ensure only authenticated users can perform scraping requests.
        currentUserResolver.resolve(principal, authentication);
        return webScrapeService.extract(request);
    }

    @PostMapping("/export")
    public DataAnalysisFileResponse export(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @Valid @RequestBody WebScrapeExportRequest request,
            HttpServletRequest httpServletRequest
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        String baseUrl = ServletUriComponentsBuilder.fromRequestUri(httpServletRequest)
                .replacePath(null)
                .build()
                .toUriString();

        return webScrapeExportService.export(user, request, baseUrl);
    }
}
