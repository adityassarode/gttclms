package com.gttc.lms.controller;

import com.gttc.lms.dto.ChatbotMessageRequest;
import com.gttc.lms.dto.ChatbotMessageResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.ChatbotService;
import com.gttc.lms.service.CurrentUserResolver;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {
    private final ChatbotService chatbotService;
    private final CurrentUserResolver currentUserResolver;

    public ChatbotController(
            ChatbotService chatbotService,
            CurrentUserResolver currentUserResolver
    ) {
        this.chatbotService = chatbotService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping("/message")
    public ChatbotMessageResponse message(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @Valid @RequestBody ChatbotMessageRequest request
    ) {
        User user = null;
        boolean hasAuthenticatedPrincipal = principal instanceof User || authentication instanceof JwtAuthenticationToken;
        if (hasAuthenticatedPrincipal) {
            user = currentUserResolver.resolve(principal, authentication);
        }

        String senderId = request.getSenderId();
        if (user != null) {
            senderId = "user-" + user.getId();
        }

        String reply = chatbotService.ask(request.getMessage(), senderId);
        return new ChatbotMessageResponse(reply);
    }
}
