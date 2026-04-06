package com.gttc.lms.controller;

import com.gttc.lms.dto.WebScrapeRequest;
import com.gttc.lms.dto.WebScrapeResponse;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.WebScrapeService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/web-scrape")
public class WebScrapeController {
    private final WebScrapeService webScrapeService;
    private final CurrentUserResolver currentUserResolver;

    public WebScrapeController(WebScrapeService webScrapeService, CurrentUserResolver currentUserResolver) {
        this.webScrapeService = webScrapeService;
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
}
