package com.gttc.lms.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class ReserveRequest {
    @NotNull
    private UUID bookId;

    public UUID getBookId() {
        return bookId;
    }

    public void setBookId(UUID bookId) {
        this.bookId = bookId;
    }
}
