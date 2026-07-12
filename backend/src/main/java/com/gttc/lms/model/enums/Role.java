package com.gttc.lms.model.enums;

public enum Role {
    USER,
    ADMIN,
    SUPER_ADMIN;

    public boolean hasAdminPrivileges() {
        return this == ADMIN || this == SUPER_ADMIN;
    }
}
