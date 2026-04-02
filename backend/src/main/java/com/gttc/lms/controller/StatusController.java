package com.gttc.lms.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatusController {

    @GetMapping("/")
    public Map<String, String> root() {
        return Map.of(
                "name", "GTTC LMS Backend",
                "status", "ok",
                "booksEndpoint", "/api/books"
        );
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "up");
    }
}
