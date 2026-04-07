package com.gttc.lms.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "user_face_verifications")
public class UserFaceVerification {
    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "app_user_id", nullable = false, unique = true)
    private Long appUserId;

    @Lob
    @Column(name = "image_data", nullable = false)
    private byte[] imageData;

    @Column(name = "image_mime_type", nullable = false)
    private String imageMimeType;

    @Column(name = "image_size_bytes", nullable = false)
    private int imageSizeBytes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public UUID getId() {
        return id;
    }

    public Long getAppUserId() {
        return appUserId;
    }

    public void setAppUserId(Long appUserId) {
        this.appUserId = appUserId;
    }

    public byte[] getImageData() {
        return imageData;
    }

    public void setImageData(byte[] imageData) {
        this.imageData = imageData;
    }

    public String getImageMimeType() {
        return imageMimeType;
    }

    public void setImageMimeType(String imageMimeType) {
        this.imageMimeType = imageMimeType;
    }

    public int getImageSizeBytes() {
        return imageSizeBytes;
    }

    public void setImageSizeBytes(int imageSizeBytes) {
        this.imageSizeBytes = imageSizeBytes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
