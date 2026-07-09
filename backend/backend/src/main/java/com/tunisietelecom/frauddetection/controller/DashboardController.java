package com.tunisietelecom.frauddetection.controller;

import com.tunisietelecom.frauddetection.domain.entity.Prediction;
import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.AlertStatus;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.dto.response.PredictionResponse;
import com.tunisietelecom.frauddetection.repository.AlertRepository;
import com.tunisietelecom.frauddetection.repository.CdrRepository;
import com.tunisietelecom.frauddetection.repository.PredictionRepository;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * KPIs filtres par role.
 * Scope analyste (1a) : adminIds optionnel, IGNORE pour un ADMIN
 * (un admin ne peut pas consulter le perimetre d un autre).
 */
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "KPIs et statistiques")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final CdrRepository cdrRepository;
    private final PredictionRepository predictionRepository;
    private final AlertRepository alertRepository;
    private final UserRepository userRepository;

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    private boolean hasScope(List<Long> adminIds) {
        return adminIds != null && !adminIds.isEmpty();
    }

    @GetMapping("/kpis")
    @Operation(summary = "KPIs selon le role, scope analyste optionnel")
    public ResponseEntity<Map<String, Object>> getKpis(
            Authentication authentication,
            @RequestParam(required = false) List<Long> adminIds) {

        User user = getUser(authentication);
        long totalCdrs, totalPredictions, totalFrauds, openAlerts;

        if (user.getRole() == Role.ADMIN) {
            // Counts agreges : plus de N+1 (ancien code : 2 requetes par CDR)
            Long id = user.getId();
            totalCdrs = cdrRepository.countByImportBatchImportedById(id);
            totalPredictions = predictionRepository.countByCdrImportBatchImportedById(id);
            totalFrauds = predictionRepository.countByIsFraudTrueAndCdrImportBatchImportedById(id);
            openAlerts = alertRepository.countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.OPEN, id);
        } else if (hasScope(adminIds)) {
            totalCdrs = cdrRepository.countByImportBatchImportedByIdIn(adminIds);
            totalPredictions = predictionRepository.countByCdrImportBatchImportedByIdIn(adminIds);
            totalFrauds = predictionRepository.countByIsFraudTrueAndCdrImportBatchImportedByIdIn(adminIds);
            openAlerts = alertRepository.countByStatusAndPredictionCdrImportBatchImportedByIdIn(AlertStatus.OPEN, adminIds);
        } else {
            totalCdrs = cdrRepository.count();
            totalPredictions = predictionRepository.count();
            totalFrauds = predictionRepository.countByIsFraudTrue();
            openAlerts = alertRepository.countByStatus(AlertStatus.OPEN);
        }

        double fraudRate = totalPredictions > 0
                ? Math.round((double) totalFrauds / totalPredictions * 10000.0) / 100.0 : 0.0;

        Map<String, Object> kpis = new HashMap<>();
        kpis.put("totalCdrs", totalCdrs);
        kpis.put("totalAnalyzed", totalPredictions);
        kpis.put("totalFrauds", totalFrauds);
        kpis.put("fraudRate", fraudRate);
        kpis.put("openAlerts", openAlerts);
        return ResponseEntity.ok(kpis);
    }

    @GetMapping("/top-suspicious")
    @Operation(summary = "Top 10 appels les plus suspects, scope analyste optionnel")
    public ResponseEntity<List<PredictionResponse>> getTopSuspicious(
            Authentication authentication,
            @RequestParam(required = false) List<Long> adminIds) {

        User user = getUser(authentication);
        PageRequest top10 = PageRequest.of(0, 10, Sort.by("fraudScore").descending());
        List<Prediction> predictions;

        if (user.getRole() == Role.ADMIN) {
            predictions = predictionRepository
                    .findByCdrImportBatchImportedById(user.getId(), PageRequest.of(0, 10)).getContent();
        } else if (hasScope(adminIds)) {
            predictions = predictionRepository
                    .findByCdrImportBatchImportedByIdIn(adminIds, PageRequest.of(0, 10)).getContent();
        } else {
            predictions = predictionRepository.findAll(top10).getContent();
        }

        List<PredictionResponse> result = predictions.stream()
                .map(p -> PredictionResponse.builder()
                        .id(p.getId()).cdrId(p.getCdr().getId())
                        .callId(p.getCdr().getCallId().toString())
                        .fraudScore(p.getFraudScore()).isFraud(p.getIsFraud())
                        .modelVersion(p.getModelVersion()).predictedAt(p.getPredictedAt())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/alerts-summary")
    @Operation(summary = "Resume des alertes, scope analyste optionnel")
    public ResponseEntity<Map<String, Object>> getAlertsSummary(
            Authentication authentication,
            @RequestParam(required = false) List<Long> adminIds) {

        User user = getUser(authentication);
        Map<String, Object> summary = new HashMap<>();

        if (user.getRole() == Role.ADMIN) {
            Long id = user.getId();
            summary.put("open", alertRepository.countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.OPEN, id));
            summary.put("inProgress", alertRepository.countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.IN_PROGRESS, id));
            summary.put("resolved", alertRepository.countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.RESOLVED, id));
        } else if (hasScope(adminIds)) {
            summary.put("open", alertRepository.countByStatusAndPredictionCdrImportBatchImportedByIdIn(AlertStatus.OPEN, adminIds));
            summary.put("inProgress", alertRepository.countByStatusAndPredictionCdrImportBatchImportedByIdIn(AlertStatus.IN_PROGRESS, adminIds));
            summary.put("resolved", alertRepository.countByStatusAndPredictionCdrImportBatchImportedByIdIn(AlertStatus.RESOLVED, adminIds));
        } else {
            summary.put("open", alertRepository.countByStatus(AlertStatus.OPEN));
            summary.put("inProgress", alertRepository.countByStatus(AlertStatus.IN_PROGRESS));
            summary.put("resolved", alertRepository.countByStatus(AlertStatus.RESOLVED));
        }
        return ResponseEntity.ok(summary);
    }
}