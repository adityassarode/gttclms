package com.gttc.lms.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationManagerResolver;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationProvider;
import org.springframework.stereotype.Component;

@Component
public class SupabaseIssuerAuthenticationManagerResolver
        implements AuthenticationManagerResolver<HttpServletRequest> {

    private final AppBearerTokenResolver bearerTokenResolver;
    private final ObjectMapper objectMapper;
    private final Set<String> configuredIssuers;
    private final ConcurrentMap<String, AuthenticationManager> managers = new ConcurrentHashMap<>();
    private final AuthenticationManager rejectingManager = authentication -> {
        throw new BadCredentialsException("Untrusted token issuer");
    };

    public SupabaseIssuerAuthenticationManagerResolver(
            AppBearerTokenResolver bearerTokenResolver,
            ObjectMapper objectMapper,
            @Value("${SUPABASE_ISSUER_URI:}") String primaryIssuer,
            @Value("${APP_SUPABASE_ALLOWED_ISSUERS:}") String allowedIssuers
    ) {
        this.bearerTokenResolver = bearerTokenResolver;
        this.objectMapper = objectMapper;
        this.configuredIssuers = parseConfiguredIssuers(primaryIssuer, allowedIssuers);

        for (String issuer : this.configuredIssuers) {
            managers.computeIfAbsent(issuer, this::buildAuthenticationManager);
        }
    }

    @Override
    public AuthenticationManager resolve(HttpServletRequest request) {
        String token = bearerTokenResolver.resolve(request);
        if (token == null) {
            return rejectingManager;
        }

        String issuer = extractIssuer(token);
        if (issuer == null || !isTrustedIssuer(issuer)) {
            return rejectingManager;
        }

        return managers.computeIfAbsent(issuer, this::buildAuthenticationManager);
    }

    private AuthenticationManager buildAuthenticationManager(String issuer) {
        JwtDecoder decoder = JwtDecoders.fromIssuerLocation(issuer);
        JwtAuthenticationProvider provider = new JwtAuthenticationProvider(decoder);
        return new ProviderManager(provider);
    }

    private Set<String> parseConfiguredIssuers(String primaryIssuer, String allowedIssuersCsv) {
        Set<String> issuers = new LinkedHashSet<>();
        addIssuer(issuers, primaryIssuer);

        if (allowedIssuersCsv != null && !allowedIssuersCsv.isBlank()) {
            String[] parts = allowedIssuersCsv.split(",");
            for (String part : parts) {
                addIssuer(issuers, part);
            }
        }

        return issuers;
    }

    private void addIssuer(Set<String> issuers, String issuer) {
        String normalized = normalizeIssuer(issuer);
        if (normalized != null) {
            issuers.add(normalized);
        }
    }

    private String extractIssuer(String token) {
        String[] parts = token.split("\\.");
        if (parts.length < 2) {
            return null;
        }

        try {
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            Map<String, Object> claims = objectMapper.readValue(payload, new TypeReference<Map<String, Object>>() {
            });
            Object issuer = claims.get("iss");
            if (!(issuer instanceof String value)) {
                return null;
            }
            return normalizeIssuer(value);
        } catch (Exception ex) {
            return null;
        }
    }

    private boolean isTrustedIssuer(String issuer) {
        if (issuer == null) {
            return false;
        }

        if (configuredIssuers.contains(issuer)) {
            return true;
        }

        try {
            URI uri = URI.create(issuer);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            String path = uri.getPath();

            if (!"https".equalsIgnoreCase(scheme) || host == null || path == null) {
                return false;
            }

            return host.endsWith(".supabase.co") && "/auth/v1".equals(path);
        } catch (Exception ex) {
            return false;
        }
    }

    private String normalizeIssuer(String issuer) {
        if (issuer == null) {
            return null;
        }

        String value = issuer.trim();
        if (value.isEmpty()) {
            return null;
        }

        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }

        return value;
    }
}
