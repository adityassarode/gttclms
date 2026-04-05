package com.gttc.lms.service;

import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.User;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class UserUuidResolver {
    private UserUuidResolver() {
    }

    public static UUID resolve(User user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        String providerId = user.getProviderId();
        if (providerId != null && !providerId.isBlank()) {
            try {
                return UUID.fromString(providerId.trim());
            } catch (IllegalArgumentException ignored) {
                // Fall back to a deterministic app-user UUID below.
            }
        }

        if (user.getId() != null) {
            return UUID.nameUUIDFromBytes(("app-user-" + user.getId()).getBytes(StandardCharsets.UTF_8));
        }

        throw new ApiException(HttpStatus.UNAUTHORIZED, "Unable to resolve user identity");
    }
}
