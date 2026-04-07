package com.gttc.lms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gttc.lms.exception.ApiException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Service
public class ChatbotService {
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();
    private final String rasaWebhookUrl;
    private final String rasaAuthToken;

    public ChatbotService(
            ObjectMapper objectMapper,
            @Value("${app.chatbot.rasaWebhookUrl:}") String rasaWebhookUrl,
            @Value("${app.chatbot.rasaAuthToken:}") String rasaAuthToken
    ) {
        this.objectMapper = objectMapper;
        this.rasaWebhookUrl = rasaWebhookUrl;
        this.rasaAuthToken = rasaAuthToken;
    }

    public String ask(String message, String senderId) {
        if (!StringUtils.hasText(message)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Message is required");
        }

        if (!StringUtils.hasText(rasaWebhookUrl)) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Chatbot service is not configured");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        if (StringUtils.hasText(rasaAuthToken)) {
            headers.setBearerAuth(rasaAuthToken.trim());
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sender", StringUtils.hasText(senderId) ? senderId.trim() : "guest");
        payload.put("message", message.trim());

        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(
                    rasaWebhookUrl.trim(),
                    HttpMethod.POST,
                    new HttpEntity<>(payload, headers),
                    String.class
            );
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Unable to connect to chatbot service");
        }

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Chatbot service returned an invalid response");
        }

        String body = response.getBody();
        if (!StringUtils.hasText(body)) {
            return "I could not find a response right now. Please try again.";
        }

        try {
            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray() || root.isEmpty()) {
                return "I could not find a response right now. Please try again.";
            }

            List<String> parts = new ArrayList<>();
            for (JsonNode node : root) {
                String text = node.path("text").asText("");
                if (StringUtils.hasText(text)) {
                    parts.add(text.trim());
                }
            }

            if (parts.isEmpty()) {
                return "I could not find a response right now. Please try again.";
            }

            return String.join("\n\n", parts);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Unable to parse chatbot response");
        }
    }
}
