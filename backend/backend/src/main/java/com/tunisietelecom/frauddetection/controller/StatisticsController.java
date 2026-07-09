package com.tunisietelecom.frauddetection.controller;

import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.repository.AlertRepository;
import com.tunisietelecom.frauddetection.repository.CdrRepository;
import com.tunisietelecom.frauddetection.repository.PredictionRepository;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Statistiques avec resolution de perimetre unifiee :
 * - ADMIN            -> toujours restreint a ses propres donnees (adminIds ignore)
 * - ANALYSTE + scope -> restreint a la selection adminIds
 * - ANALYSTE global  -> toutes les donnees (scope null)
 * Un seul chemin de code : les repositories scoped recoivent la liste resolue.
 */
@RestController
@RequestMapping("/api/v1/statistics")
@RequiredArgsConstructor
@Tag(name = "Statistics", description = "Statistiques et graphiques")
@SecurityRequirement(name = "bearerAuth")
public class StatisticsController {

    private final PredictionRepository predictionRepository;
    private final CdrRepository cdrRepository;
    private final AlertRepository alertRepository;
    private final UserRepository userRepository;

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    /** null = global ; sinon liste effective du perimetre. */
    private List<Long> resolveScope(User user, List<Long> adminIds) {
        if (user.getRole() == Role.ADMIN) {
            return List.of(user.getId());
        }
        return (adminIds != null && !adminIds.isEmpty()) ? adminIds : null;
    }

    @GetMapping("/fraud-trend")
    @Operation(summary = "Evolution des fraudes par jour")
    public ResponseEntity<List<Map<String, Object>>> getFraudTrend(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false) List<Long> adminIds,
            Authentication auth) {

        List<Long> scope = resolveScope(getUser(auth), adminIds);
        List<Map<String, Object>> trend = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (int i = days - 1; i >= 0; i--) {
            LocalDateTime start = now.minusDays(i).toLocalDate().atStartOfDay();
            LocalDateTime end = start.plusDays(1);
            long total, frauds;
            if (scope != null) {
                total = predictionRepository.countByPredictedAtBetweenAndCdrImportBatchImportedByIdIn(start, end, scope);
                frauds = predictionRepository.countByIsFraudTrueAndPredictedAtBetweenAndCdrImportBatchImportedByIdIn(start, end, scope);
            } else {
                total = predictionRepository.countByPredictedAtBetween(start, end);
                frauds = predictionRepository.countByIsFraudTrueAndPredictedAtBetween(start, end);
            }
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", start.toLocalDate().toString());
            point.put("total", total);
            point.put("frauds", frauds);
            point.put("legitimes", total - frauds);
            trend.add(point);
        }
        return ResponseEntity.ok(trend);
    }

    @GetMapping("/by-country")
    @Operation(summary = "Fraudes par pays de destination")
    public ResponseEntity<List<Map<String, Object>>> getByCountry(
            @RequestParam(required = false) List<Long> adminIds, Authentication auth) {
        List<Long> scope = resolveScope(getUser(auth), adminIds);
        return ResponseEntity.ok(scope != null
                ? cdrRepository.countFraudsByCountryScoped(scope)
                : cdrRepository.countFraudsByCountry());
    }

    @GetMapping("/by-hour")
    @Operation(summary = "Distribution des fraudes par heure")
    public ResponseEntity<List<Map<String, Object>>> getByHour(
            @RequestParam(required = false) List<Long> adminIds, Authentication auth) {
        List<Long> scope = resolveScope(getUser(auth), adminIds);
        return ResponseEntity.ok(scope != null
                ? predictionRepository.countFraudsByHourScoped(scope)
                : predictionRepository.countFraudsByHour());
    }

    @GetMapping("/by-severity")
    @Operation(summary = "Alertes par severite")
    public ResponseEntity<List<Map<String, Object>>> getBySeverity(
            @RequestParam(required = false) List<Long> adminIds, Authentication auth) {
        List<Long> scope = resolveScope(getUser(auth), adminIds);
        return ResponseEntity.ok(scope != null
                ? alertRepository.countBySeverityGroupScoped(scope)
                : alertRepository.countBySeverityGroup());
    }

    @GetMapping("/summary")
    @Operation(summary = "Resume global pour la periode")
    public ResponseEntity<Map<String, Object>> getSummary(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false) List<Long> adminIds,
            Authentication auth) {

        List<Long> scope = resolveScope(getUser(auth), adminIds);
        LocalDateTime start = LocalDateTime.now().minusDays(days);
        long totalPredictions, totalFrauds, totalCdrs;

        if (scope != null) {
            totalPredictions = predictionRepository.countByPredictedAtAfterAndCdrImportBatchImportedByIdIn(start, scope);
            totalFrauds = predictionRepository.countByIsFraudTrueAndPredictedAtAfterAndCdrImportBatchImportedByIdIn(start, scope);
            totalCdrs = cdrRepository.countByCreatedAtAfterAndImportBatchImportedByIdIn(start, scope);
        } else {
            totalPredictions = predictionRepository.countByPredictedAtAfter(start);
            totalFrauds = predictionRepository.countByIsFraudTrueAndPredictedAtAfter(start);
            totalCdrs = cdrRepository.countByCreatedAtAfter(start);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("period", days + " jours");
        summary.put("totalCdrs", totalCdrs);
        summary.put("totalAnalyzed", totalPredictions);
        summary.put("totalFrauds", totalFrauds);
        summary.put("fraudRate", totalPredictions > 0
                ? Math.round((double) totalFrauds / totalPredictions * 10000.0) / 100.0 : 0.0);
        return ResponseEntity.ok(summary);
    }
}