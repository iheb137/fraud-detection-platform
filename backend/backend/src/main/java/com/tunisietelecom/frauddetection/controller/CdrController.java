package com.tunisietelecom.frauddetection.controller;

import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.dto.response.CdrResponse;
import com.tunisietelecom.frauddetection.dto.response.ImportBatchResponse;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import com.tunisietelecom.frauddetection.service.CdrService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/cdrs")
@RequiredArgsConstructor
@Tag(name = "CDR", description = "Gestion des Call Detail Records")
@SecurityRequirement(name = "bearerAuth")
public class CdrController {

    private final CdrService cdrService;
    private final UserRepository userRepository;

    @PostMapping("/import")
    @Operation(summary = "Importer un fichier CSV de CDR")
    public ResponseEntity<ImportBatchResponse> importCsv(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        // Seuls ADMIN et SUPERADMIN peuvent importer
        if (user.getRole() == Role.ANALYSTE) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(cdrService.importCsv(file, user.getId()));
    }

    @GetMapping
    @Operation(summary = "Lister les CDR avec pagination et filtres")
    public ResponseEntity<Page<CdrResponse>> findAll(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String callingNumber,
            @RequestParam(required = false) String callType) {

        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

        PageRequest pageable = PageRequest.of(page, size, Sort.by("callStartTime").descending());
        return ResponseEntity.ok(cdrService.findAll(pageable, callingNumber, callType, user));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detail d un CDR")
    public ResponseEntity<CdrResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(cdrService.findById(id));
    }
}