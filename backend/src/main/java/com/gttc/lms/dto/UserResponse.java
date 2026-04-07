package com.gttc.lms.dto;

import com.gttc.lms.model.enums.Role;
import com.gttc.lms.model.enums.UserStatus;
import java.time.Instant;

public class UserResponse {
    private Long id;
    private String email;
    private String name;
    private String avatarUrl;
    private String phone;
    private String registerNumber;
    private String department;
    private String semester;
    private String year;
    private Role role;
    private UserStatus status;
    private boolean verified;
    private boolean faceVerified;
    private Instant faceVerifiedAt;
    private boolean faceImageAvailable;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getRegisterNumber() {
        return registerNumber;
    }

    public void setRegisterNumber(String registerNumber) {
        this.registerNumber = registerNumber;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getSemester() {
        return semester;
    }

    public void setSemester(String semester) {
        this.semester = semester;
    }

    public String getYear() {
        return year;
    }

    public void setYear(String year) {
        this.year = year;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public boolean isFaceVerified() {
        return faceVerified;
    }

    public void setFaceVerified(boolean faceVerified) {
        this.faceVerified = faceVerified;
    }

    public Instant getFaceVerifiedAt() {
        return faceVerifiedAt;
    }

    public void setFaceVerifiedAt(Instant faceVerifiedAt) {
        this.faceVerifiedAt = faceVerifiedAt;
    }

    public boolean isFaceImageAvailable() {
        return faceImageAvailable;
    }

    public void setFaceImageAvailable(boolean faceImageAvailable) {
        this.faceImageAvailable = faceImageAvailable;
    }
}
