package com.gttc.lms.dto;

import jakarta.validation.constraints.NotBlank;

public class TopicVideoCommentRequest {
    @NotBlank
    private String comment;

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
