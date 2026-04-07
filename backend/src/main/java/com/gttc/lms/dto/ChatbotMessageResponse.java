package com.gttc.lms.dto;

public class ChatbotMessageResponse {
    private String reply;

    public ChatbotMessageResponse() {
    }

    public ChatbotMessageResponse(String reply) {
        this.reply = reply;
    }

    public String getReply() {
        return reply;
    }

    public void setReply(String reply) {
        this.reply = reply;
    }
}
