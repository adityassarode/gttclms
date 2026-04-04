package com.gttc.lms.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gttc.lms.exception.ErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

@Configuration
public class SecurityErrorHandlersConfig {
    private static final String JSON_CONTENT_TYPE = "application/json";

    private final ObjectMapper objectMapper;

    public SecurityErrorHandlersConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) ->
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Authentication required");
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) ->
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Access denied");
    }

    private void writeJsonError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(JSON_CONTENT_TYPE);
        objectMapper.writeValue(response.getOutputStream(), new ErrorResponse(message));
    }
}
