package com.gttc.lms.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "topic_video_comments")
public class TopicVideoComment {
    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "video_id", nullable = false)
    private UUID videoId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "comment_text", nullable = false, length = 4000)
    private String commentText;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() {
        return id;
    }

    public UUID getVideoId() {
        return videoId;
    }

    public void setVideoId(UUID videoId) {
        this.videoId = videoId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getCommentText() {
        return commentText;
    }

    public void setCommentText(String commentText) {
        this.commentText = commentText;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
