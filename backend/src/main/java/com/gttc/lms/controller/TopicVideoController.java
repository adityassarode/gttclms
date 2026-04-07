package com.gttc.lms.controller;

import com.gttc.lms.dto.TopicVideoCommentRequest;
import com.gttc.lms.dto.TopicVideoCommentResponse;
import com.gttc.lms.dto.TopicVideoRequest;
import com.gttc.lms.dto.TopicVideoResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.TopicVideoService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/topic-videos")
public class TopicVideoController {
    private final TopicVideoService topicVideoService;
    private final CurrentUserResolver currentUserResolver;

    public TopicVideoController(TopicVideoService topicVideoService, CurrentUserResolver currentUserResolver) {
        this.topicVideoService = topicVideoService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping
    public TopicVideoResponse create(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @Valid @RequestBody TopicVideoRequest request
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return topicVideoService.create(user, request);
    }

    @GetMapping
    public List<TopicVideoResponse> list(
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String year
    ) {
        return topicVideoService.list(subject, department, semester, year);
    }

    @DeleteMapping("/{id}")
    public void delete(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID id
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        topicVideoService.delete(user, id);
    }

    @GetMapping("/{id}/comments")
    public List<TopicVideoCommentResponse> listComments(@PathVariable UUID id) {
        return topicVideoService.listComments(id);
    }

    @PostMapping("/{id}/comments")
    public TopicVideoCommentResponse addComment(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody TopicVideoCommentRequest request
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return topicVideoService.addComment(user, id, request.getComment());
    }
}
