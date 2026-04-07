package com.gttc.lms.dto;

import jakarta.validation.constraints.NotBlank;

public class TopicVideoRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String subject;

    @NotBlank
    private String department;

    @NotBlank
    private String semester;

    @NotBlank
    private String year;

    @NotBlank
    private String videoUrl;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
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

    public String getVideoUrl() {
        return videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }
}
