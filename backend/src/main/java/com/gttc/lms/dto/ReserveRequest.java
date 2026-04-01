package com.gttc.lms.dto;

import jakarta.validation.constraints.NotNull;

public class ReserveRequest {
    @NotNull
    private Long bookId;

    public Long getBookId() {
        return bookId;
    }

    public void setBookId(Long bookId) {
        this.bookId = bookId;
    }
}
