package com.gttc.lms.controller;

import com.gttc.lms.dto.DepartmentResponse;
import com.gttc.lms.dto.DepartmentResourceResponse;
import com.gttc.lms.model.Department;
import com.gttc.lms.repository.DepartmentRepository;
import com.gttc.lms.model.DepartmentResource;
import com.gttc.lms.service.DepartmentService;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {
    private final DepartmentService departmentService;
    private final DepartmentRepository departmentRepository;

    public DepartmentController(DepartmentService departmentService, DepartmentRepository departmentRepository) {
        this.departmentService = departmentService;
        this.departmentRepository = departmentRepository;
    }

    @GetMapping
    public List<DepartmentResponse> list(@RequestParam(required = false) String q) {
        List<Department> departments = (q == null || q.isBlank())
                ? departmentService.listPublished()
                : departmentService.searchPublished(q);
        return departments.stream().map(this::toDto).collect(Collectors.toList());
    }

    @GetMapping("/search")
    public java.util.List<com.gttc.lms.dto.DepartmentSearchResult> search(@RequestParam String q) {
        var results = departmentService.searchAcross(q);
        java.util.Map<Long, Department> deptCache = new java.util.HashMap<>();
        java.util.List<com.gttc.lms.dto.DepartmentSearchResult> out = new java.util.ArrayList<>();

        for (var r : results) {
            Department d = deptCache.computeIfAbsent(r.getDepartmentId(), id -> departmentRepository.findById(id).orElse(null));
            if (d == null) continue;
            com.gttc.lms.dto.DepartmentSearchResult item = new com.gttc.lms.dto.DepartmentSearchResult();
            item.department = toDto(d);
            item.folder = r.getFolder();
            item.resource = toResourceDto(r);
            out.add(item);
        }

        return out;
    }

    @GetMapping("/{id}")
    public DepartmentResponse get(@PathVariable Long id) {
        Department d = departmentService.findById(id).orElseThrow();
        if (!d.isPublished()) {
            throw new java.util.NoSuchElementException("Department not found");
        }
        return toDto(d);
    }

    @GetMapping("/{id}/resources")
    public List<DepartmentResourceResponse> resources(@PathVariable Long id, @RequestParam(required = false) String q) {
        List<DepartmentResource> res = (q == null || q.isBlank()) ? departmentService.listResources(id) : departmentService.searchResources(id, q);
        return res.stream().map(this::toResourceDto).collect(Collectors.toList());
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

    private DepartmentResourceResponse toResourceDto(DepartmentResource rsrc) {
        DepartmentResourceResponse r = new DepartmentResourceResponse();
        r.id = rsrc.getId();
        r.departmentId = rsrc.getDepartmentId();
        r.title = rsrc.getTitle();
        r.description = rsrc.getDescription();
        r.fileUrl = rsrc.getFileUrl();
        r.fileType = rsrc.getFileType();
        r.folder = rsrc.getFolder();
        r.createdAt = rsrc.getCreatedAt();
        return r;
    }
}
