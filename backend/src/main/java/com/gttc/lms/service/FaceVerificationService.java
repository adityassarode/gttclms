package com.gttc.lms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gttc.lms.dto.FaceVerificationSessionResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.FaceVerificationSession;
import com.gttc.lms.model.User;
import com.gttc.lms.model.UserFaceVerification;
import com.gttc.lms.model.enums.Role;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.FaceVerificationSessionRepository;
import com.gttc.lms.repository.UserFaceVerificationRepository;
import com.gttc.lms.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Iterator;
import java.util.Locale;
import java.net.URLEncoder;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

@Service
public class FaceVerificationService {
    private static final long MAX_IMAGE_BYTES = 2L * 1024L * 1024L;
    private static final int MAX_IMAGE_DIMENSION = 1280;

    private final UserRepository userRepository;
    private final UserFaceVerificationRepository userFaceVerificationRepository;
    private final FaceVerificationSessionRepository faceVerificationSessionRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    private final String faceEndpoint;
    private final String faceApiKey;
    private final String faceRecognitionModel;
    private final int sessionTtlMinutes;
    private final String frontendUrls;

    public FaceVerificationService(
            UserRepository userRepository,
            UserFaceVerificationRepository userFaceVerificationRepository,
            FaceVerificationSessionRepository faceVerificationSessionRepository,
            ObjectMapper objectMapper,
            @Value("${app.azure.face.endpoint:}") String faceEndpoint,
            @Value("${app.azure.face.apiKey:}") String faceApiKey,
            @Value("${app.azure.face.recognitionModel:recognition_04}") String faceRecognitionModel,
            @Value("${app.azure.face.connectTimeoutMs:7000}") int faceConnectTimeoutMs,
            @Value("${app.azure.face.readTimeoutMs:15000}") int faceReadTimeoutMs,
            @Value("${app.face.qrSessionMinutes:10}") int sessionTtlMinutes,
            @Value("${app.frontendUrls:http://localhost:3000}") String frontendUrls
    ) {
        this.userRepository = userRepository;
        this.userFaceVerificationRepository = userFaceVerificationRepository;
        this.faceVerificationSessionRepository = faceVerificationSessionRepository;
        this.objectMapper = objectMapper;
        this.restTemplate = createFaceApiRestTemplate(faceConnectTimeoutMs, faceReadTimeoutMs);
        this.faceEndpoint = faceEndpoint;
        this.faceApiKey = faceApiKey;
        this.faceRecognitionModel = faceRecognitionModel;
        this.sessionTtlMinutes = sessionTtlMinutes;
        this.frontendUrls = frontendUrls;
    }

    private RestTemplate createFaceApiRestTemplate(int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Math.max(1000, connectTimeoutMs));
        requestFactory.setReadTimeout(Math.max(1000, readTimeoutMs));
        return new RestTemplate(requestFactory);
    }

    @Transactional
    public User verifyAuthenticatedUser(User user, String imageDataUrl, String sessionToken) {
        validateVerifiedUser(user);

        FaceVerificationSession session = null;
        if (StringUtils.hasText(sessionToken)) {
            session = faceVerificationSessionRepository.findByTokenAndAppUserId(sessionToken.trim(), user.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Face verification session not found"));
            ensureSessionActive(session);
        }

        byte[] compressedImage = decodeAndCompressImage(imageDataUrl);
        validateFaceWithAzure(compressedImage);
        upsertFaceRecord(user.getId(), compressedImage);
        markFaceVerified(user);

        if (session != null) {
            markSessionCompleted(session);
        }

        return userRepository.save(user);
    }

    @Transactional
    public User verifyUsingSessionToken(String sessionToken, String imageDataUrl) {
        if (!StringUtils.hasText(sessionToken)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Session token is required");
        }

        FaceVerificationSession session = faceVerificationSessionRepository.findByToken(sessionToken.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Face verification session not found"));

        ensureSessionActive(session);

        User user = userRepository.findById(session.getAppUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        validateVerifiedUser(user);

        byte[] compressedImage = decodeAndCompressImage(imageDataUrl);
        validateFaceWithAzure(compressedImage);
        upsertFaceRecord(user.getId(), compressedImage);
        markFaceVerified(user);
        markSessionCompleted(session);

        userRepository.save(user);
        return user;
    }

    @Transactional
    public FaceVerificationSessionResponse createSession(User user, String redirectPath) {
        validateVerifiedUser(user);

        FaceVerificationSession session = new FaceVerificationSession();
        session.setToken(generateSessionToken());
        session.setAppUserId(user.getId());
        session.setRedirectPath(normalizeRedirectPath(redirectPath));
        session.setStatus(FaceVerificationSession.STATUS_PENDING);
        session.setExpiresAt(Instant.now().plusSeconds(Math.max(1, sessionTtlMinutes) * 60L));

        faceVerificationSessionRepository.save(session);
        return toSessionResponse(session);
    }

    @Transactional
    public FaceVerificationSessionResponse getSession(User user, String token) {
        validateUser(user);

        FaceVerificationSession session = faceVerificationSessionRepository
                .findByTokenAndAppUserId(token, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Face verification session not found"));

        expireIfNeeded(session);
        return toSessionResponse(session);
    }

    @Transactional
    public FaceImagePayload getFaceImageForAdmin(User admin, Long targetUserId) {
        validateUser(admin);
        if (admin.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required");
        }

        UserFaceVerification verification = userFaceVerificationRepository
                .findByAppUserId(targetUserId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Face image not found"));

        return new FaceImagePayload(verification.getImageData(), verification.getImageMimeType());
    }

    @Transactional
    public boolean hasFaceImage(Long appUserId) {
        return userFaceVerificationRepository.existsByAppUserId(appUserId);
    }

    private void upsertFaceRecord(Long appUserId, byte[] imageData) {
        UserFaceVerification row = userFaceVerificationRepository.findByAppUserId(appUserId)
                .orElseGet(UserFaceVerification::new);

        row.setAppUserId(appUserId);
        row.setImageData(imageData);
        row.setImageMimeType(MediaType.IMAGE_JPEG_VALUE);
        row.setImageSizeBytes(imageData.length);
        row.setUpdatedAt(Instant.now());

        userFaceVerificationRepository.save(row);
    }

    private void validateFaceWithAzure(byte[] imageBytes) {
        if (!StringUtils.hasText(faceEndpoint) || !StringUtils.hasText(faceApiKey)) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Azure Face API is not configured on the server"
            );
        }

        String requestUrl = buildFaceDetectUrl();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Ocp-Apim-Subscription-Key", faceApiKey.trim());
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);

        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(
                    requestUrl,
                    HttpMethod.POST,
                    new HttpEntity<>(imageBytes, headers),
                    String.class
            );
        } catch (HttpStatusCodeException ex) {
            throw toAzureApiException(ex);
        } catch (ResourceAccessException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Azure Face API timed out. Please try again with better network.");
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Azure Face API request failed");
        }

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Azure Face API returned an invalid response");
        }

        String body = response.getBody();
        if (!StringUtils.hasText(body)) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Azure Face API returned an empty response");
        }

        try {
            JsonNode faces = objectMapper.readTree(body);
            if (!faces.isArray() || faces.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "No face detected. Please try again.");
            }
            if (faces.size() > 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Multiple faces detected. Ensure only your face is visible and try again.");
            }

            JsonNode attributes = faces.get(0).path("faceAttributes");
            String quality = attributes.path("qualityForRecognition").asText("");
            if ("low".equalsIgnoreCase(quality)) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Face quality is too low. Improve lighting and try again.");
            }

            String blurLevel = attributes.path("blur").path("blurLevel").asText("");
            if ("high".equalsIgnoreCase(blurLevel)) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Image is too blurry. Hold still and try again.");
            }

            boolean eyeOccluded = attributes.path("occlusion").path("eyeOccluded").asBoolean(false);
            if (eyeOccluded) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Eyes are not clearly visible. Remove obstruction and try again.");
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Unable to parse Azure Face API response");
        }
    }

    private String buildFaceDetectUrl() {
        String endpoint = faceEndpoint == null ? "" : faceEndpoint.trim();
        endpoint = endpoint.replaceAll("/+$", "");
        String recognitionModel = StringUtils.hasText(faceRecognitionModel)
                ? faceRecognitionModel.trim()
                : "recognition_04";

        String lowerEndpoint = endpoint.toLowerCase(Locale.ROOT);
        if (lowerEndpoint.endsWith("/face/v1.0")) {
            endpoint = endpoint.substring(0, endpoint.length() - "/face/v1.0".length());
        }

        return endpoint
                + "/face/v1.0/detect"
                + "?returnFaceId=false"
                + "&returnFaceLandmarks=false"
                + "&returnFaceAttributes=qualityForRecognition,blur,occlusion"
                + "&detectionModel=detection_03"
                + "&recognitionModel=" + URLEncoder.encode(recognitionModel, StandardCharsets.UTF_8);
    }

    private ApiException toAzureApiException(HttpStatusCodeException exception) {
        HttpStatus status = HttpStatus.BAD_GATEWAY;
        String parsedMessage = parseAzureErrorMessage(exception.getResponseBodyAsString());

        if (exception.getStatusCode().value() == 401 || exception.getStatusCode().value() == 403) {
            return new ApiException(status,
                    "Azure Face API authentication failed. Check face endpoint and API key.");
        }

        if (exception.getStatusCode().value() == 404) {
            return new ApiException(status,
                    "Azure Face API endpoint not found. Verify APP_AZURE_FACE_ENDPOINT format.");
        }

        if (exception.getStatusCode().value() == 429) {
            return new ApiException(status,
                    "Azure Face API rate limit exceeded. Please wait a moment and try again.");
        }

        if (StringUtils.hasText(parsedMessage)) {
            return new ApiException(status, "Azure Face API error: " + parsedMessage);
        }

        return new ApiException(status, "Azure Face API request failed");
    }

    private String parseAzureErrorMessage(String responseBody) {
        if (!StringUtils.hasText(responseBody)) {
            return "";
        }

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String errorMessage = root.path("error").path("message").asText("");
            if (StringUtils.hasText(errorMessage)) {
                return errorMessage.trim();
            }

            String rootMessage = root.path("message").asText("");
            return StringUtils.hasText(rootMessage) ? rootMessage.trim() : "";
        } catch (Exception ignored) {
            return "";
        }
    }

    private byte[] decodeAndCompressImage(String imageDataUrl) {
        if (!StringUtils.hasText(imageDataUrl)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Face image is required");
        }

        String trimmed = imageDataUrl.trim();
        String base64;
        int commaIndex = trimmed.indexOf(',');
        if (trimmed.startsWith("data:") && commaIndex >= 0) {
            base64 = trimmed.substring(commaIndex + 1);
        } else {
            base64 = trimmed;
        }

        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid face image payload");
        }

        if (decoded.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Face image payload is empty");
        }

        BufferedImage source;
        try {
            source = ImageIO.read(new ByteArrayInputStream(decoded));
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported face image format");
        }

        if (source == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to decode face image");
        }

        BufferedImage normalized = normalizeImage(source);

        float[] qualitySequence = new float[] {0.82f, 0.72f, 0.62f, 0.52f};
        for (float quality : qualitySequence) {
            byte[] candidate = encodeJpeg(normalized, quality);
            if (candidate.length <= MAX_IMAGE_BYTES) {
                return candidate;
            }
        }

        throw new ApiException(HttpStatus.BAD_REQUEST,
                "Captured image is too large. Move back from camera and try again.");
    }

    private BufferedImage normalizeImage(BufferedImage source) {
        int sourceWidth = Math.max(1, source.getWidth());
        int sourceHeight = Math.max(1, source.getHeight());

        int targetWidth = sourceWidth;
        int targetHeight = sourceHeight;

        int largest = Math.max(sourceWidth, sourceHeight);
        if (largest > MAX_IMAGE_DIMENSION) {
            double scale = (double) MAX_IMAGE_DIMENSION / (double) largest;
            targetWidth = Math.max(1, (int) Math.round(sourceWidth * scale));
            targetHeight = Math.max(1, (int) Math.round(sourceHeight * scale));
        }

        BufferedImage rgb = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = rgb.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, targetWidth, targetHeight);
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }

        return rgb;
    }

    private byte[] encodeJpeg(BufferedImage image, float quality) {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "JPEG encoder is not available");
        }

        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
             ImageOutputStream imageOutputStream = ImageIO.createImageOutputStream(outputStream)) {
            writer.setOutput(imageOutputStream);

            ImageWriteParam params = writer.getDefaultWriteParam();
            if (params.canWriteCompressed()) {
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                params.setCompressionQuality(Math.max(0.1f, Math.min(quality, 1.0f)));
            }

            writer.write(null, new IIOImage(image, null, null), params);
            writer.dispose();
            return outputStream.toByteArray();
        } catch (Exception ex) {
            writer.dispose();
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to compress face image");
        }
    }

    private void ensureSessionActive(FaceVerificationSession session) {
        expireIfNeeded(session);
        if (FaceVerificationSession.STATUS_EXPIRED.equals(session.getStatus())) {
            throw new ApiException(HttpStatus.GONE, "Face verification session expired");
        }
        if (FaceVerificationSession.STATUS_COMPLETED.equals(session.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Face verification session already completed");
        }
    }

    private void expireIfNeeded(FaceVerificationSession session) {
        if (FaceVerificationSession.STATUS_PENDING.equals(session.getStatus())
                && session.getExpiresAt() != null
                && session.getExpiresAt().isBefore(Instant.now())) {
            session.setStatus(FaceVerificationSession.STATUS_EXPIRED);
            faceVerificationSessionRepository.save(session);
        }
    }

    private void markSessionCompleted(FaceVerificationSession session) {
        session.setStatus(FaceVerificationSession.STATUS_COMPLETED);
        session.setCompletedAt(Instant.now());
        faceVerificationSessionRepository.save(session);
    }

    private void markFaceVerified(User user) {
        user.setFaceVerified(true);
        user.setFaceVerifiedAt(Instant.now());
    }

    private FaceVerificationSessionResponse toSessionResponse(FaceVerificationSession session) {
        FaceVerificationSessionResponse response = new FaceVerificationSessionResponse();
        response.setToken(session.getToken());
        response.setStatus(session.getStatus());
        response.setRedirectPath(session.getRedirectPath());
        response.setExpiresAt(session.getExpiresAt());
        response.setCompletedAt(session.getCompletedAt());
        response.setVerificationUrl(buildVerificationUrl(session.getToken()));
        return response;
    }

    private String buildVerificationUrl(String token) {
        String origin = resolveFrontendOrigin();
        return origin
                + "/face-verify?session="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
    }

    private String resolveFrontendOrigin() {
        String[] candidates = frontendUrls.split(",");
        for (String candidate : candidates) {
            String trimmed = candidate == null ? "" : candidate.trim();
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                return trimmed;
            }
        }
        return "http://localhost:3000";
    }

    private String generateSessionToken() {
        byte[] bytes = new byte[24];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String normalizeRedirectPath(String redirectPath) {
        if (!StringUtils.hasText(redirectPath)) {
            return "/";
        }
        String value = redirectPath.trim();
        if (!value.startsWith("/")) {
            return "/";
        }
        return value;
    }

    private void validateVerifiedUser(User user) {
        validateUser(user);
        if (!user.isVerified()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Complete student verification before face verification");
        }
    }

    private void validateUser(User user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }

    public static final class FaceImagePayload {
        private final byte[] imageData;
        private final String contentType;

        public FaceImagePayload(byte[] imageData, String contentType) {
            this.imageData = imageData;
            this.contentType = contentType;
        }

        public byte[] getImageData() {
            return imageData;
        }

        public String getContentType() {
            return contentType;
        }
    }
}
