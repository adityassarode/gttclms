package com.gttc.lms.dto;

import jakarta.validation.constraints.NotBlank;

public class FaceVerificationRequest {
    @NotBlank
    private String imageDataUrl;

    private String sessionToken;

    public String getImageDataUrl() {
        return imageDataUrl;
    }

    public void setImageDataUrl(String imageDataUrl) {
        this.imageDataUrl = imageDataUrl;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }
}
