package com.gttc.lms.controller;

import com.gttc.lms.dto.DepartmentRequest;
import com.gttc.lms.dto.DepartmentResponse;
import com.gttc.lms.dto.DepartmentResourceResponse;
import com.gttc.lms.model.Department;
import com.gttc.lms.model.DepartmentResource;
import com.gttc.lms.service.DepartmentService;
import com.gttc.lms.service.FileStorageService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/departments")
public class AdminDepartmentController {
    private final DepartmentService departmentService;
    private final FileStorageService fileStorageService;

    public AdminDepartmentController(DepartmentService departmentService, FileStorageService fileStorageService) {
        this.departmentService = departmentService;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<DepartmentResponse> listAll() {
        return departmentService.listAll().stream().map(this::toDto).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public DepartmentResponse get(@PathVariable Long id) {
        Department department = departmentService.findById(id).orElseThrow();
        return toDto(department);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Department create(@Valid @RequestBody DepartmentRequest request) {
        return departmentService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Department update(@PathVariable Long id, @Valid @RequestBody DepartmentRequest request) {
        return departmentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        departmentService.delete(id);
    }

    // Assign a user as a Department Admin for a department
    @PostMapping("/{id}/assign/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public void assign(@PathVariable Long id, @PathVariable Long userId) {
        departmentService.assignAdmin(id, userId);
    }

    @GetMapping("/{id}/resources")
    @PreAuthorize("hasRole('ADMIN')")
    public List<DepartmentResourceResponse> listResources(@PathVariable Long id) {
        departmentService.findById(id).orElseThrow();
        return departmentService.listResources(id).stream().map(this::toResourceDto).toList();
    }

    @PostMapping(value = "/{id}/resources", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public DepartmentResourceResponse uploadResource(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam Map<String, String> fields
    ) {
        departmentService.findById(id).orElseThrow();
        String url = fileStorageService.store("departments/" + id, file);
        DepartmentResource resource = new DepartmentResource();
        resource.setDepartmentId(id);
        resource.setTitle(defaultIfBlank(fields.get("title"), file.getOriginalFilename()));
        resource.setDescription(blankToNull(fields.get("description")));
        resource.setFileUrl(url);
        resource.setFileType(file.getContentType());
        resource.setFolder(blankToNull(fields.get("folder")));
        DepartmentResource saved = departmentService.addResource(id, resource);

        return toResourceDto(saved);
    }

    private DepartmentResourceResponse toResourceDto(DepartmentResource resource) {
        DepartmentResourceResponse resp = new DepartmentResourceResponse();
        resp.id = resource.getId();
        resp.departmentId = resource.getDepartmentId();
        resp.title = resource.getTitle();
        resp.description = resource.getDescription();
        resp.fileUrl = resource.getFileUrl();
        resp.fileType = resource.getFileType();
        resp.folder = resource.getFolder();
        resp.createdAt = resource.getCreatedAt();
        return resp;
    }

    private String defaultIfBlank(String value, String defaultValue) {
        String normalized = blankToNull(value);
        return normalized == null ? defaultValue : normalized;
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    private DepartmentResponse toDto(Department d) {
        DepartmentResponse r = new DepartmentResponse();
        r.id = d.getId();
        r.slug = d.getSlug();
        r.name = d.getName();
        r.description = d.getDescription();
        r.logoUrl = d.getLogoUrl();
        r.published = d.isPublished();
        r.createdAt = d.getCreatedAt();
        return r;
    }
}
