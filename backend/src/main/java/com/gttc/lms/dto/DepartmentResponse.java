package com.gttc.lms.dto;

import java.time.Instant;

public class DepartmentResponse {
    public Long id;
    public String slug;
    public String name;
    public String description;
    public String logoUrl;
    public boolean published;
    public Instant createdAt;
}
