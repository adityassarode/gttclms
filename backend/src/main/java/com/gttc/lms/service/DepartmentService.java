package com.gttc.lms.service;

import com.gttc.lms.dto.DepartmentRequest;
import com.gttc.lms.model.Department;
import com.gttc.lms.model.DepartmentResource;
import com.gttc.lms.model.DepartmentAdminAssignment;
import com.gttc.lms.model.User;
import com.gttc.lms.repository.DepartmentRepository;
import com.gttc.lms.repository.DepartmentResourceRepository;
import com.gttc.lms.repository.DepartmentAdminAssignmentRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
public class DepartmentService {
    private final DepartmentRepository departmentRepository;
    private final DepartmentResourceRepository resourceRepository;
    private final DepartmentAdminAssignmentRepository assignmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository, DepartmentResourceRepository resourceRepository, DepartmentAdminAssignmentRepository assignmentRepository) {
        this.departmentRepository = departmentRepository;
        this.resourceRepository = resourceRepository;
        this.assignmentRepository = assignmentRepository;
    }

    public List<Department> listPublished() {
        return departmentRepository.findAll()
                .stream()
                .filter(Department::isPublished)
                .toList();
    }

    public List<Department> searchPublished(String q) {
        return departmentRepository.searchPublished(q == null ? "" : q);
    }

    public List<Department> listAll() {
        return departmentRepository.findAll();
    }

    public Optional<Department> findById(Long id) {
        return departmentRepository.findById(id);
    }

    public Optional<Department> findPublishedByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }

        Optional<Department> department = parseLong(identifier)
                .flatMap(departmentRepository::findById)
                .or(() -> departmentRepository.findBySlug(identifier));

        return department.filter(Department::isPublished);
    }

    public List<DepartmentResource> listResources(Long departmentId) {
        return resourceRepository.findByDepartmentIdOrderByCreatedAtDesc(departmentId);
    }

    public List<DepartmentResource> searchResources(Long departmentId, String q) {
        return resourceRepository.searchInDepartment(departmentId, q == null ? "" : q);
    }

    public List<DepartmentResource> searchAcross(String q) {
        return resourceRepository.searchAcrossDepartments(q == null ? "" : q);
    }

    @Transactional
    public Department create(DepartmentRequest req) {
        Department d = new Department();
        d.setSlug(req.slug);
        d.setName(req.name);
        d.setDescription(req.description);
        d.setLogoUrl(req.logoUrl);
        d.setPublished(req.published != null ? req.published : false);
        return departmentRepository.save(d);
    }

    @Transactional
    public Department update(Long id, DepartmentRequest req) {
        Department d = departmentRepository.findById(id).orElseThrow();
        if (req.slug != null) d.setSlug(req.slug);
        if (req.name != null) d.setName(req.name);
        if (req.description != null) d.setDescription(req.description);
        if (req.logoUrl != null) d.setLogoUrl(req.logoUrl);
        if (req.published != null) d.setPublished(req.published);
        return departmentRepository.save(d);
    }

    @Transactional
    public void delete(Long id) {
        departmentRepository.deleteById(id);
    }

    @Transactional
    public DepartmentResource addResource(Long departmentId, DepartmentResource resource) {
        resource.setDepartmentId(departmentId);
        return resourceRepository.save(resource);
    }

    @Transactional
    public DepartmentAdminAssignment assignAdmin(Long departmentId, Long userId) {
        DepartmentAdminAssignment a = new DepartmentAdminAssignment();
        a.setAppUserId(userId);
        a.setDepartmentId(departmentId);
        return assignmentRepository.save(a);
    }

    public boolean isUserAssignedToDepartment(Long userId, Long departmentId) {
        return assignmentRepository.findByAppUserIdAndDepartmentId(userId, departmentId).isPresent();
    }

    private Optional<Long> parseLong(String value) {
        try {
            return Optional.of(Long.parseLong(value));
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }
}
