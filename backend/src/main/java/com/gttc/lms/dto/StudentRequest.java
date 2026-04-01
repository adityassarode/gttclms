package com.gttc.lms.dto;

import jakarta.validation.constraints.NotBlank;

public class StudentRequest {
    @NotBlank
    private String registerNumber;

    @NotBlank
    private String name;

    @NotBlank
    private String department;

    @NotBlank
    private String semester;

    @NotBlank
    private String year;

    public String getRegisterNumber() {
        return registerNumber;
    }

    public void setRegisterNumber(String registerNumber) {
        this.registerNumber = registerNumber;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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
}
