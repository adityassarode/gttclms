package com.gttc.lms.service;

import com.gttc.lms.dto.StudentRequest;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Student;
import com.gttc.lms.repository.StudentRepository;
import java.io.InputStream;
import java.util.Locale;
import java.util.ArrayList;
import java.util.List;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StudentService {
    private final StudentRepository studentRepository;

    public StudentService(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    @Transactional(readOnly = true)
    public Student findByRegisterNumber(String registerNumber) {
        String raw = sanitizeRegisterNumber(registerNumber);
        String normalized = normalizeRegisterNumber(raw);

        return studentRepository.findByRegisterNumber(raw)
                .or(() -> studentRepository.findFirstByRegisterNumberIgnoreCase(raw))
                .or(() -> normalized.isEmpty()
                        ? java.util.Optional.empty()
                        : studentRepository.findByRegisterNumberNormalized(normalized))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Register number not found"));
    }

    public Student addStudent(StudentRequest request) {
        String registerNumber = sanitizeRegisterNumber(request.getRegisterNumber());

        findExistingByRegisterNumber(registerNumber).ifPresent(existing -> {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Register number already exists");
        });

        Student student = new Student();
        student.setRegisterNumber(registerNumber);
        student.setName(request.getName());
        student.setDepartment(request.getDepartment());
        student.setSemester(request.getSemester());
        student.setYear(request.getYear());
        return studentRepository.save(student);
    }

    public List<Student> uploadStudents(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No file provided");
        }
        List<Student> imported = new ArrayList<>();
        try (InputStream input = file.getInputStream(); Workbook workbook = new XSSFWorkbook(input)) {
            Sheet sheet = workbook.getSheetAt(0);
            boolean headerSkipped = false;
            for (Row row : sheet) {
                if (!headerSkipped) {
                    headerSkipped = true;
                    continue;
                }
                String registerNumber = readCell(row.getCell(0));
                String name = readCell(row.getCell(1));
                String department = readCell(row.getCell(2));
                String semester = readCell(row.getCell(3));
                String year = readCell(row.getCell(4));
                if (registerNumber.isBlank() || name.isBlank()) {
                    continue;
                }
                findExistingByRegisterNumber(registerNumber).ifPresentOrElse(existing -> {
                    existing.setName(name);
                    existing.setDepartment(department);
                    existing.setSemester(semester);
                    existing.setYear(year);
                    studentRepository.save(existing);
                }, () -> {
                    Student student = new Student();
                    student.setRegisterNumber(registerNumber);
                    student.setName(name);
                    student.setDepartment(department);
                    student.setSemester(semester);
                    student.setYear(year);
                    imported.add(studentRepository.save(student));
                });
            }
            return imported;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to read Excel file");
        }
    }

    private String readCell(Cell cell) {
        if (cell == null) {
            return "";
        }
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue()).trim();
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue()).trim();
            default -> "";
        };
    }

    private java.util.Optional<Student> findExistingByRegisterNumber(String registerNumber) {
        String raw = sanitizeRegisterNumber(registerNumber);
        String normalized = normalizeRegisterNumber(raw);

        return studentRepository.findByRegisterNumber(raw)
                .or(() -> studentRepository.findFirstByRegisterNumberIgnoreCase(raw))
                .or(() -> normalized.isEmpty()
                        ? java.util.Optional.empty()
                        : studentRepository.findByRegisterNumberNormalized(normalized));
    }

    private String sanitizeRegisterNumber(String value) {
        if (value == null) {
            return "";
        }
        return value.trim();
    }

    private String normalizeRegisterNumber(String value) {
        return sanitizeRegisterNumber(value)
                .replace(" ", "")
                .replace("-", "")
                .toUpperCase(Locale.ROOT);
    }
}
