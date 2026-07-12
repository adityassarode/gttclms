package com.gttc.lms.service;

import com.gttc.lms.dto.TopicVideoCommentResponse;
import com.gttc.lms.dto.TopicVideoRequest;
import com.gttc.lms.dto.TopicVideoResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.TopicVideo;
import com.gttc.lms.model.TopicVideoComment;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.Role;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.TopicVideoCommentRepository;
import com.gttc.lms.repository.TopicVideoRepository;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TopicVideoService {
    private final TopicVideoRepository topicVideoRepository;
    private final TopicVideoCommentRepository topicVideoCommentRepository;
    private final UserIdentityBridgeService userIdentityBridgeService;

    public TopicVideoService(
            TopicVideoRepository topicVideoRepository,
            TopicVideoCommentRepository topicVideoCommentRepository,
            UserIdentityBridgeService userIdentityBridgeService
    ) {
        this.topicVideoRepository = topicVideoRepository;
        this.topicVideoCommentRepository = topicVideoCommentRepository;
        this.userIdentityBridgeService = userIdentityBridgeService;
    }

    @Transactional
    public TopicVideoResponse create(User user, TopicVideoRequest request) {
        validateUser(user);
        validateAdmin(user);

        TopicVideo video = new TopicVideo();
        video.setTitle(requireValue(request.getTitle(), "Title is required"));
        video.setSubjectName(requireValue(request.getSubject(), "Subject is required"));
        video.setDepartment(requireValue(request.getDepartment(), "Department is required"));
        video.setSemester(requireValue(request.getSemester(), "Semester is required"));
        video.setAcademicYear(requireValue(request.getYear(), "Year is required"));
        video.setVideoUrl(requireValue(request.getVideoUrl(), "Video URL is required"));
        video.setUploadedByUserId(userIdentityBridgeService.resolveOperationalUserId(user));

        topicVideoRepository.save(video);
        return toResponse(video);
    }

    @Transactional(readOnly = true)
    public List<TopicVideoResponse> list(
            String subject,
            String department,
            String semester,
            String year
    ) {
        return topicVideoRepository
                .search(
                        normalizeContains(subject),
                        normalizeExact(department),
                        normalizeExact(semester),
                        normalizeExact(year)
                )
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void delete(User user, UUID videoId) {
        validateUser(user);
        validateAdmin(user);

        TopicVideo video = topicVideoRepository.findById(videoId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Video not found"));

        topicVideoCommentRepository.deleteByVideoId(videoId);
        topicVideoRepository.delete(video);
    }

    @Transactional(readOnly = true)
    public List<TopicVideoCommentResponse> listComments(UUID videoId) {
        ensureVideoExists(videoId);
        return topicVideoCommentRepository.findByVideoIdOrderByCreatedAtAsc(videoId)
                .stream()
                .map(this::toCommentResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TopicVideoCommentResponse addComment(User user, UUID videoId, String comment) {
        validateUser(user);
        ensureVideoExists(videoId);

        String message = requireValue(comment, "Comment is required");

        TopicVideoComment row = new TopicVideoComment();
        row.setVideoId(videoId);
        row.setUserId(userIdentityBridgeService.resolveOperationalUserId(user));
        row.setCommentText(message);

        topicVideoCommentRepository.save(row);
        return toCommentResponse(row);
    }

    private void ensureVideoExists(UUID videoId) {
        if (!topicVideoRepository.existsById(videoId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Video not found");
        }
    }

    private TopicVideoResponse toResponse(TopicVideo video) {
        TopicVideoResponse response = new TopicVideoResponse();
        response.setId(video.getId());
        response.setTitle(video.getTitle());
        response.setSubject(video.getSubjectName());
        response.setDepartment(video.getDepartment());
        response.setSemester(video.getSemester());
        response.setYear(video.getAcademicYear());
        response.setVideoUrl(video.getVideoUrl());
        response.setCreatedAt(video.getCreatedAt());
        return response;
    }

    private TopicVideoCommentResponse toCommentResponse(TopicVideoComment comment) {
        TopicVideoCommentResponse response = new TopicVideoCommentResponse();
        response.setId(comment.getId());
        response.setVideoId(comment.getVideoId());
        response.setUserId(comment.getUserId());
        response.setComment(comment.getCommentText());
        response.setCommentedBy(userIdentityBridgeService.resolveDisplayName(comment.getUserId()));
        response.setCreatedAt(comment.getCreatedAt());
        return response;
    }

    private void validateUser(User user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }

    private void validateAdmin(User user) {
        if ((user.getRole() == null || !user.getRole().hasAdminPrivileges())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private String requireValue(String value, String message) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        }
        return normalized;
    }

    private String normalizeContains(String value) {
        String normalized = trimToNull(value);
        return normalized == null ? "" : normalized.toLowerCase(Locale.ROOT);
    }

    private String normalizeExact(String value) {
        String normalized = trimToNull(value);
        return normalized == null ? "" : normalized.toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
