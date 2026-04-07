package com.gttc.lms.controller;

import com.gttc.lms.dto.FaceVerificationRequest;
import com.gttc.lms.dto.FaceVerificationSessionCreateRequest;
import com.gttc.lms.dto.FaceVerificationSessionResponse;
import com.gttc.lms.dto.UserResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.User;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.DtoMapper;
import com.gttc.lms.service.FaceVerificationService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/face")
public class FaceVerificationController {
    private final FaceVerificationService faceVerificationService;
    private final CurrentUserResolver currentUserResolver;

    public FaceVerificationController(
            FaceVerificationService faceVerificationService,
            CurrentUserResolver currentUserResolver
    ) {
        this.faceVerificationService = faceVerificationService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping("/verify")
    public UserResponse verify(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @Valid @RequestBody FaceVerificationRequest request
    ) {
        User user = null;
        boolean hasAuthenticatedPrincipal = principal instanceof User || authentication instanceof JwtAuthenticationToken;

        if (hasAuthenticatedPrincipal) {
            user = currentUserResolver.resolve(principal, authentication);
        }

        User updated;
        if (user != null) {
            updated = faceVerificationService.verifyAuthenticatedUser(
                    user,
                    request.getImageDataUrl(),
                    request.getSessionToken()
            );
        } else {
            if (request.getSessionToken() == null || request.getSessionToken().isBlank()) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
            }
            updated = faceVerificationService.verifyUsingSessionToken(
                    request.getSessionToken(),
                    request.getImageDataUrl()
            );
        }

        UserResponse response = DtoMapper.toUser(updated);
        response.setFaceImageAvailable(true);
        return response;
    }

    @PostMapping("/sessions")
    public FaceVerificationSessionResponse createSession(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @RequestBody(required = false) FaceVerificationSessionCreateRequest request
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        String redirectPath = request == null ? null : request.getRedirectPath();
        return faceVerificationService.createSession(user, redirectPath);
    }

    @GetMapping("/sessions/{token}")
    public FaceVerificationSessionResponse getSession(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable String token
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return faceVerificationService.getSession(user, token);
    }

    @GetMapping("/admin/{userId}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> getFaceImageForAdmin(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable Long userId
    ) {
        User admin = currentUserResolver.resolve(principal, authentication);
        FaceVerificationService.FaceImagePayload payload = faceVerificationService.getFaceImageForAdmin(admin, userId);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (payload.getContentType() != null && !payload.getContentType().isBlank()) {
            mediaType = MediaType.parseMediaType(payload.getContentType());
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(payload.getImageData());
    }
}
