package com.tunisietelecom.frauddetection.controller;

import com.tunisietelecom.frauddetection.domain.entity.Alert;
import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.AlertStatus;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.dto.response.AlertResponse;
import com.tunisietelecom.frauddetection.exception.ResourceNotFoundException;
import com.tunisietelecom.frauddetection.repository.AlertRepository;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
@Tag(name = "Alertes", description = "Gestion des alertes de fraude")
@SecurityRequirement(name = "bearerAuth")
public class AlertController {

    private final AlertRepository alertRepository;
    private final UserRepository userRepository;

    /**
     * Liste paginee + compteurs globaux dans la MEME reponse.
     * Source de verite unique : impossible de desynchroniser liste et badges.
     */
    @GetMapping
    @Operation(summary = "Liste des alertes avec compteurs globaux")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        Map<String, Object> body = new HashMap<>();

        if (user.getRole() == Role.ADMIN) {
            Long userId = user.getId();

            List<Long> alertIds = alertRepository.findAlertIdsByAdminId(userId);
            int total = alertIds.size();
            int start = Math.min(page * size, total);
            int end = Math.min(start + size, total);
            List<Long> pageIds = alertIds.subList(start, end);

            Map<Long, Alert> byId = alertRepository.findAllById(pageIds).stream()
                    .collect(Collectors.toMap(Alert::getId, Function.identity()));
            List<AlertResponse> content = pageIds.stream()
                    .map(byId::get)
                    .filter(Objects::nonNull)
                    .map(this::toResponse)
                    .collect(Collectors.toList());

            body.put("content", content);
            body.put("totalElements", total);
            body.put("totalPages", (int) Math.ceil((double) total / size));
            body.put("page", page);

            body.put("openCount", alertRepository
                    .countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.OPEN, userId));
            body.put("inProgressCount", alertRepository
                    .countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.IN_PROGRESS, userId));
            body.put("resolvedCount", alertRepository
                    .countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.RESOLVED, userId));

        } else {
            PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
            Page<AlertResponse> p = alertRepository.findAll(pageable).map(this::toResponse);

            body.put("content", p.getContent());
            body.put("totalElements", p.getTotalElements());
            body.put("totalPages", p.getTotalPages());
            body.put("page", page);

            body.put("openCount", alertRepository.countByStatus(AlertStatus.OPEN));
            body.put("inProgressCount", alertRepository.countByStatus(AlertStatus.IN_PROGRESS));
            body.put("resolvedCount", alertRepository.countByStatus(AlertStatus.RESOLVED));
        }

        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detail d une alerte")
    @Transactional(readOnly = true)
    public ResponseEntity<AlertResponse> findById(@PathVariable Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + id));
        return ResponseEntity.ok(toResponse(alert));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Mettre a jour le statut")
    @Transactional
    public ResponseEntity<AlertResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam AlertStatus status) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + id));
        alert.setStatus(status);
        alertRepository.save(alert);
        return ResponseEntity.ok(toResponse(alert));
    }

    private AlertResponse toResponse(Alert alert) {
        AlertResponse.AlertResponseBuilder builder = AlertResponse.builder()
                .id(alert.getId())
                .severity(alert.getSeverity() != null ? alert.getSeverity().name() : null)
                .status(alert.getStatus() != null ? alert.getStatus().name() : null)
                .createdAt(alert.getCreatedAt())
                .resolutionNote(alert.getResolutionNote());

        if (alert.getPrediction() != null) {
            builder.fraudScore(alert.getPrediction().getFraudScore() != null
                    ? alert.getPrediction().getFraudScore().doubleValue() : null);
        }

        if (alert.getCdr() != null) {
            builder.cdrId(alert.getCdr().getId())
                    .callingNumber(alert.getCdr().getCallingNumber())
                    .callId(alert.getCdr().getCallId() != null
                            ? alert.getCdr().getCallId().toString() : null);
        }

        return builder.build();
    }
}