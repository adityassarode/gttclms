package com.gttc.lms.dto;

import java.time.Instant;

public class DepartmentResourceResponse {
    public Long id;
    public Long departmentId;
    public String title;
    public String description;
    public String fileUrl;
    public String fileType;
    public String folder;
    public Instant createdAt;
}
