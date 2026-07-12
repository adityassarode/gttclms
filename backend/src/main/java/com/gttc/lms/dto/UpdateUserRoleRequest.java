package com.gttc.lms.dto;

import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.enums.Role;
import jakarta.validation.constraints.NotBlank;
import java.util.Locale;
import org.springframework.http.HttpStatus;

public class UpdateUserRoleRequest {
    @NotBlank
    private String role;

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Role resolveRole() {
        String normalized = role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role is required");
        }

        try {
            return Role.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported role: " + role);
        }
    }
}