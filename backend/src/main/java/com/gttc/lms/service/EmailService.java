package com.gttc.lms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(12);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String mode;
    private final String from;
    private final String resendApiKey;

    public EmailService(ObjectMapper objectMapper,
                        @Value("${app.mail.mode}") String mode,
                        @Value("${app.mail.from}") String from,
                        @Value("${app.mail.resend.apiKey:}") String resendApiKey) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
        this.mode = mode;
        this.from = from;
        this.resendApiKey = resendApiKey;
    }

    public void send(String to, String subject, String body) {
        queueSend(to, subject, toHtml(body));
    }

    public void sendHtml(String to, String subject, String htmlBody) {
        queueSend(to, subject, htmlBody);
    }

    public boolean sendHtmlAndWait(String to, String subject, String htmlBody) {
        return sendHtmlAndWait(to, subject, htmlBody, null, null);
    }

    public boolean sendHtmlAndWait(
            String to,
            String subject,
            String htmlBody,
            String attachmentFileName,
            byte[] attachmentBytes
    ) {
        if (to == null || to.isBlank()) {
            return false;
        }

        if (!"resend".equalsIgnoreCase(mode)) {
            logger.info("Email to {} subject '{}' body: {}", to, subject, htmlBody);
            return false;
        }

        if (resendApiKey == null || resendApiKey.isBlank()) {
            logger.warn("Email skipped: APP_RESEND_API_KEY is not configured");
            return false;
        }

        return sendWithResend(to, subject, htmlBody, attachmentFileName, attachmentBytes);
    }

    private void queueSend(String to, String subject, String htmlBody) {
        if (to == null || to.isBlank()) {
            return;
        }

        if (!"resend".equalsIgnoreCase(mode)) {
            logger.info("Email to {} subject '{}' body: {}", to, subject, htmlBody);
            return;
        }

        if (resendApiKey == null || resendApiKey.isBlank()) {
            logger.warn("Email skipped: APP_RESEND_API_KEY is not configured");
            return;
        }

        CompletableFuture.runAsync(() -> sendWithResend(to, subject, htmlBody, null, null));
    }

        private boolean sendWithResend(
            String to,
            String subject,
            String htmlBody,
            String attachmentFileName,
            byte[] attachmentBytes
        ) {
        try {
            Map<String, Object> payload;
            if (attachmentBytes != null && attachmentBytes.length > 0 && attachmentFileName != null && !attachmentFileName.isBlank()) {
            payload = Map.of(
                "from", from,
                "to", List.of(to),
                "subject", subject,
                "html", htmlBody,
                "attachments", List.of(Map.of(
                    "filename", attachmentFileName,
                    "content", Base64.getEncoder().encodeToString(attachmentBytes)
                ))
            );
            } else {
            payload = Map.of(
                "from", from,
                "to", List.of(to),
                "subject", subject,
                "html", htmlBody
            );
            }

            String body = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder(URI.create(RESEND_API_URL))
                    .timeout(REQUEST_TIMEOUT)
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                logger.warn(
                        "Resend send failed with status {} and body {}",
                        response.statusCode(),
                        response.body()
                );
                return false;
            }

            return true;
        } catch (Exception ex) {
            logger.warn("Failed to send email with Resend", ex);
            return false;
        }
    }

    private String toHtml(String plainText) {
        String safe = escapeHtml(plainText == null ? "" : plainText);
        return "<p>" + safe.replace("\n", "<br/>") + "</p>";
    }

    private String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
