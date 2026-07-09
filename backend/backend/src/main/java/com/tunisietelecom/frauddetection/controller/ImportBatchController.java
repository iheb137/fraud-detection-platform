package com.tunisietelecom.frauddetection.controller;

import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.dto.response.CdrResponse;
import com.tunisietelecom.frauddetection.dto.response.ImportBatchDetailResponse;
import com.tunisietelecom.frauddetection.repository.AlertRepository;
import com.tunisietelecom.frauddetection.repository.CdrRepository;
import com.tunisietelecom.frauddetection.repository.ImportBatchRepository;
import com.tunisietelecom.frauddetection.repository.PredictionRepository;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import com.tunisietelecom.frauddetection.repository.InterventionRepository;
import com.tunisietelecom.frauddetection.repository.InterventionMessageRepository;
import com.tunisietelecom.frauddetection.exception.ResourceNotFoundException;
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
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/batches")
@RequiredArgsConstructor
@Tag(name = "Import Batches", description = "Gestion des lots d import")
@SecurityRequirement(name = "bearerAuth")
public class ImportBatchController {

    private final ImportBatchRepository importBatchRepository;
    private final CdrRepository cdrRepository;
    private final PredictionRepository predictionRepository;
    private final AlertRepository alertRepository;
    private final UserRepository userRepository;
    private final InterventionRepository interventionRepository;
    private final InterventionMessageRepository interventionMessageRepository;

    @GetMapping
    @Operation(summary = "Liste les batches selon le role")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<Page<ImportBatchDetailResponse>> findAll(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        User currentUser = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        PageRequest pageable = PageRequest.of(page, size);
        Page<com.tunisietelecom.frauddetection.domain.entity.ImportBatch> batches;

        // ADMIN voit seulement ses imports, ANALYSTE et SUPERADMIN voient tout
        if (currentUser.getRole() == Role.ADMIN) {
            batches = importBatchRepository.findByImportedByIdOrderByImportedAtDesc(currentUser.getId(), pageable);
        } else {
            batches = importBatchRepository.findAllOrderByImportedAtDesc(pageable);
        }

        return ResponseEntity.ok(batches.map(batch -> {
            long analyzedCount = predictionRepository.countByCdrImportBatchId(batch.getId());
            long fraudCount = predictionRepository.countByCdrImportBatchIdAndIsFraudTrue(batch.getId());

            return ImportBatchDetailResponse.builder()
                .id(batch.getId())
                .filename(batch.getFilename())
                .recordCount(batch.getRecordCount())
                .status(batch.getStatus())
                .importedBy(batch.getImportedBy() != null ?
                    batch.getImportedBy().getFirstName() + " " + batch.getImportedBy().getLastName() : "Inconnu")
                .importedAt(batch.getImportedAt())
                .analyzedCount(analyzedCount)
                .fraudCount(fraudCount)
                .build();
        }));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un batch")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> deleteBatch(@PathVariable Long id, Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        com.tunisietelecom.frauddetection.domain.entity.ImportBatch batch =
            importBatchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + id));

        // ADMIN ne peut supprimer que ses propres batches
        if (currentUser.getRole() == Role.ADMIN &&
            !batch.getImportedBy().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).build();
        }

        interventionRepository.findByBatchId(id).forEach(intervention -> {
            interventionMessageRepository.deleteByInterventionId(intervention.getId());
            interventionRepository.delete(intervention);
        });
        cdrRepository.findByImportBatchId(id).forEach(cdr -> {
            alertRepository.deleteByCdrId(cdr.getId());
            predictionRepository.deleteByCdrId(cdr.getId());
        });
        cdrRepository.findByImportBatchId(id).forEach(cdr -> cdrRepository.delete(cdr));
        importBatchRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/cdrs")
    @Operation(summary = "CDR d un batch specifique")
    public ResponseEntity<Page<CdrResponse>> getCdrsByBatch(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        importBatchRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + id));
        PageRequest pageable = PageRequest.of(page, size, Sort.by("callStartTime").descending());
        return ResponseEntity.ok(
            cdrRepository.findByImportBatchId(id, pageable)
                .map(cdr -> CdrResponse.builder()
                    .id(cdr.getId())
                    .callId(cdr.getCallId().toString())
                    .callingNumber(cdr.getCallingNumber())
                    .calledNumber(cdr.getCalledNumber())
                    .callStartTime(cdr.getCallStartTime())
                    .callDurationSec(cdr.getCallDurationSec())
                    .callType(cdr.getCallType().name())
                    .destinationCountry(cdr.getDestinationCountry())
                    .callDirection(cdr.getCallDirection() != null ? cdr.getCallDirection().name() : null)
                    .revenue(cdr.getRevenue())
                    .createdAt(cdr.getCreatedAt())
                    .build())
        );
    }
}