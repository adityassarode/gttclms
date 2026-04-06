package com.gttc.lms.controller;

import com.gttc.lms.dto.DataAnalysisFileResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.DataAnalysisFileService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/data-analysis")
public class DataAnalysisController {
    private final DataAnalysisFileService dataAnalysisFileService;
    private final CurrentUserResolver currentUserResolver;

    public DataAnalysisController(
            DataAnalysisFileService dataAnalysisFileService,
            CurrentUserResolver currentUserResolver
    ) {
        this.dataAnalysisFileService = dataAnalysisFileService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping("/cleaned-files")
    public DataAnalysisFileResponse uploadCleanedFile(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String originalFileName,
            @RequestParam(required = false) String format,
            HttpServletRequest request
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        String baseUrl = ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath(null)
                .build()
                .toUriString();

        return dataAnalysisFileService.storeCleanedFile(user, file, originalFileName, format, baseUrl);
    }

    @GetMapping("/cleaned-files/me")
    public List<DataAnalysisFileResponse> listMine(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            HttpServletRequest request
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        String baseUrl = ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath(null)
                .build()
                .toUriString();

        return dataAnalysisFileService.listMine(user, baseUrl);
    }

    @GetMapping("/cleaned-files/{id}/download")
    public ResponseEntity<Resource> download(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID id
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        DataAnalysisFileService.DownloadPayload payload = dataAnalysisFileService.loadForDownload(user, id);

        String format = payload.fileFormat() == null ? "" : payload.fileFormat().toLowerCase();
        MediaType mediaType = switch (format) {
            case "xlsx" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            case "pdf" -> MediaType.APPLICATION_PDF;
            case "docx" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            default -> MediaType.parseMediaType("text/csv");
        };

        String safeFileName = payload.fileName().replace("\"", "");

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeFileName + "\"")
                .body(payload.resource());
    }

    @DeleteMapping("/cleaned-files/{id}")
    public void deleteMine(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID id
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        dataAnalysisFileService.deleteMine(user, id);
    }
}
