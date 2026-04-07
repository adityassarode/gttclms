package com.gttc.lms.dto;

import jakarta.validation.constraints.NotBlank;

public class ChatbotMessageRequest {
    @NotBlank
    private String message;

    private String senderId;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId;
    }
}
