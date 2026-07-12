package com.gttc.lms.controller;

import com.gttc.lms.dto.DepartmentRequest;
import com.gttc.lms.dto.DepartmentResponse;
import com.gttc.lms.model.Department;
import com.gttc.lms.service.DepartmentService;
import com.gttc.lms.service.FileStorageService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.MediaType;

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

    @PostMapping(value = "/{id}/resources", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public com.gttc.lms.dto.DepartmentResourceResponse uploadResource(
            @PathVariable Long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String folder
    ) {
        departmentService.findById(id).orElseThrow();
        String url = fileStorageService.store("departments/" + id, file);
        com.gttc.lms.model.DepartmentResource resource = new com.gttc.lms.model.DepartmentResource();
        resource.setDepartmentId(id);
        resource.setTitle(title == null ? file.getOriginalFilename() : title);
        resource.setDescription(description);
        resource.setFileUrl(url);
        resource.setFileType(file.getContentType());
        resource.setFolder(folder);
        com.gttc.lms.model.DepartmentResource saved = departmentService.addResource(id, resource);

        com.gttc.lms.dto.DepartmentResourceResponse resp = new com.gttc.lms.dto.DepartmentResourceResponse();
        resp.id = saved.getId();
        resp.departmentId = saved.getDepartmentId();
        resp.title = saved.getTitle();
        resp.description = saved.getDescription();
        resp.fileUrl = saved.getFileUrl();
        resp.fileType = saved.getFileType();
        resp.folder = saved.getFolder();
        resp.createdAt = saved.getCreatedAt();
        return resp;
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
