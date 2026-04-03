package com.gttc.lms.config;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.stereotype.Component;

@Component
public class AppBearerTokenResolver implements BearerTokenResolver {
    private final String localIssuerMarker;
    private final DefaultBearerTokenResolver delegate = new DefaultBearerTokenResolver();

    public AppBearerTokenResolver(@Value("${app.jwt.issuer}") String localIssuer) {
        this.localIssuerMarker = "\"iss\":\"" + localIssuer + "\"";
    }

    @Override
    public String resolve(HttpServletRequest request) {
        String token = delegate.resolve(request);
        if (token == null) {
            return null;
        }

        // Local app-issued JWTs are handled by JwtAuthFilter.
        if (isLocalAppToken(token)) {
            return null;
        }

        return token;
    }

    private boolean isLocalAppToken(String token) {
        String[] parts = token.split("\\.");
        if (parts.length < 2) {
            return false;
        }

        try {
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            return payload.contains(localIssuerMarker);
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}