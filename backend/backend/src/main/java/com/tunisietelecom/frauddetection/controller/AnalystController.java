package com.tunisietelecom.frauddetection.controller;

import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.AlertStatus;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.dto.response.AdminScopeResponse;
import com.tunisietelecom.frauddetection.repository.AlertRepository;
import com.tunisietelecom.frauddetection.repository.CdrRepository;
import com.tunisietelecom.frauddetection.repository.ImportBatchRepository;
import com.tunisietelecom.frauddetection.repository.PredictionRepository;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.client.RestTemplate;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Endpoints reserves au perimetre de travail de l analyste.
 * Un ADMIN qui appelle ces endpoints recoit 403 : son perimetre est le sien, point.
 */
@RestController
@RequestMapping("/api/v1/analyst")
@RequiredArgsConstructor
@Tag(name = "Analyst", description = "Espace de travail analyste")
@SecurityRequirement(name = "bearerAuth")
public class AnalystController {

    private final UserRepository userRepository;
    private final ImportBatchRepository importBatchRepository;
    private final CdrRepository cdrRepository;
    private final AlertRepository alertRepository;
    private final PredictionRepository predictionRepository;
    private final RestTemplate restTemplate;

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    @GetMapping("/admins")
    @Operation(summary = "Liste des admins actifs avec volumetrie (selecteur de perimetre)")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AdminScopeResponse>> getAdmins(Authentication authentication) {
        User current = userRepository.findByEmail(authentication.getName()).orElseThrow();
        if (current.getRole() == Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }

        List<AdminScopeResponse> admins = userRepository
                .findByRoleAndIsActiveTrueOrderByFirstNameAsc(Role.ADMIN)
                .stream()
                .map(a -> AdminScopeResponse.builder()
                        .id(a.getId())
                        .fullName(a.getFirstName() + " " + a.getLastName())
                        .email(a.getEmail())
                        .batchCount(importBatchRepository.countByImportedById(a.getId()))
                        .cdrCount(cdrRepository.countByImportBatchImportedById(a.getId()))
                        .openAlertCount(alertRepository
                                .countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.OPEN, a.getId()))
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(admins);
    }

    /**
     * Rapport comparatif inter-admins : la vue que seul l analyste peut produire.
     * CSV multi-sections : resume par admin, fraudes par pays, top numeros suspects.
     */
    @GetMapping("/report")
    @Operation(summary = "Rapport comparatif inter-admins (CSV)")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportReport(
            Authentication authentication,
            @org.springframework.web.bind.annotation.RequestParam(required = false) java.util.List<Long> adminIds) {

        User current = userRepository.findByEmail(authentication.getName()).orElseThrow();
        if (current.getRole() == Role.ADMIN) return ResponseEntity.status(403).build();

        java.util.List<User> admins = userRepository.findByRoleAndIsActiveTrueOrderByFirstNameAsc(Role.ADMIN);
        if (adminIds != null && !adminIds.isEmpty()) {
            admins = admins.stream().filter(a -> adminIds.contains(a.getId())).collect(Collectors.toList());
        }
        java.util.List<Long> scope = admins.stream().map(User::getId).collect(Collectors.toList());
        if (scope.isEmpty()) return ResponseEntity.badRequest().build();

        StringBuilder csv = new StringBuilder();
        csv.append("RAPPORT ANALYSTE - ").append(java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))).append('\n');

        csv.append("\nSECTION 1 - RESUME PAR ADMIN\n");
        csv.append("admin_id,nom,email,batches,cdrs,analyses,fraudes,taux_fraude_pct,alertes_ouvertes,alertes_en_cours,alertes_resolues\n");
        for (User a : admins) {
            long cdrs = cdrRepository.countByImportBatchImportedById(a.getId());
            long preds = predictionRepository.countByCdrImportBatchImportedById(a.getId());
            long frauds = predictionRepository.countByIsFraudTrueAndCdrImportBatchImportedById(a.getId());
            double taux = preds > 0 ? Math.round((double) frauds / preds * 10000.0) / 100.0 : 0.0;
            csv.append(a.getId()).append(',')
               .append(safe(a.getFirstName() + " " + a.getLastName())).append(',')
               .append(a.getEmail()).append(',')
               .append(importBatchRepository.countByImportedById(a.getId())).append(',')
               .append(cdrs).append(',').append(preds).append(',').append(frauds).append(',')
               .append(taux).append(',')
               .append(alertRepository.countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.OPEN, a.getId())).append(',')
               .append(alertRepository.countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.IN_PROGRESS, a.getId())).append(',')
               .append(alertRepository.countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.RESOLVED, a.getId())).append('\n');
        }

        csv.append("\nSECTION 2 - FRAUDES PAR PAYS (perimetre)\n");
        csv.append("pays,total_appels,fraudes\n");
        for (java.util.Map<String, Object> row : cdrRepository.countFraudsByCountryScoped(scope)) {
            csv.append(row.get("country")).append(',').append(row.get("total")).append(',')
               .append(row.get("frauds") != null ? row.get("frauds") : 0).append('\n');
        }

        csv.append("\nSECTION 3 - TOP 10 NUMEROS SUSPECTS (perimetre)\n");
        csv.append("numero,fraudes,score_max\n");
        for (java.util.Map<String, Object> row : predictionRepository.topFraudNumbersScoped(scope)) {
            csv.append(row.get("number")).append(',').append(row.get("frauds")).append(',')
               .append(row.get("max_score")).append('\n');
        }

        String filename = "rapport_analyste_" + java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmm")) + ".csv";
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    /**
     * Dataset ML : CDR analyses du perimetre, avec score, verdict modele et label analyste.
     * Les en-tetes CSV sont un CONTRAT avec le pipeline de reentrainement (Phase 2) : ne pas les modifier.
     */
    @GetMapping("/dataset")
    @Operation(summary = "Export CSV du dataset ML (perimetre optionnel)")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportDataset(
            Authentication authentication,
            @org.springframework.web.bind.annotation.RequestParam(required = false) java.util.List<Long> adminIds) {

        User current = userRepository.findByEmail(authentication.getName()).orElseThrow();
        if (current.getRole() == Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }

        boolean scoped = adminIds != null && !adminIds.isEmpty();
        java.util.List<com.tunisietelecom.frauddetection.domain.entity.Prediction> rows = scoped
                ? predictionRepository.findDatasetScoped(adminIds)
                : predictionRepository.findDatasetAll();

        StringBuilder csv = new StringBuilder();
        csv.append("call_id,calling_number,called_number,call_start_time,call_duration_sec,call_type,")
           .append("destination_country,call_direction,imei,cell_id,revenue,")
           .append("fraud_score,is_fraud,analyst_label,model_version,admin_id\n");

        java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        for (var p : rows) {
            var c = p.getCdr();
            csv.append(c.getCallId()).append(',')
               .append(safe(c.getCallingNumber())).append(',')
               .append(safe(c.getCalledNumber())).append(',')
               .append(c.getCallStartTime() != null ? c.getCallStartTime().format(fmt) : "").append(',')
               .append(c.getCallDurationSec() != null ? c.getCallDurationSec() : "").append(',')
               .append(c.getCallType() != null ? c.getCallType().name() : "").append(',')
               .append(safe(c.getDestinationCountry())).append(',')
               .append(c.getCallDirection() != null ? c.getCallDirection().name() : "").append(',')
               .append(safe(c.getImei())).append(',')
               .append(safe(c.getCellId())).append(',')
               .append(c.getRevenue() != null ? c.getRevenue() : "").append(',')
               .append(p.getFraudScore()).append(',')
               .append(p.getIsFraud()).append(',')
               .append(p.getAnalystLabel() != null ? p.getAnalystLabel() : "").append(',')
               .append(safe(p.getModelVersion())).append(',')
               .append(c.getImportBatch().getImportedBy().getId()).append('\n');
        }

        String scopeTag = scoped
                ? "scope-" + adminIds.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining("-"))
                : "scope-all";
        String filename = "dataset_ml_"
                + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmm"))
                + "_" + scopeTag + ".csv";

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    /**
     * Reentrainement pilote par l analyste : Spring genere le dataset (code 1c reutilise
     * via appel interne a exportDataset) et le pousse a FastAPI. Un seul sens de confiance :
     * le JWT reste cote Spring, FastAPI ne gere aucune authentification.
     */
    @PostMapping("/retrain")
    @Transactional(readOnly = true)
    public ResponseEntity<Object> retrain(
            Authentication authentication,
            @org.springframework.web.bind.annotation.RequestParam(required = false) java.util.List<Long> adminIds) {
        ResponseEntity<byte[]> dataset = exportDataset(authentication, adminIds);
        if (dataset.getStatusCode().value() == 403) return ResponseEntity.status(403).build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        HttpEntity<byte[]> entity = new HttpEntity<>(dataset.getBody(), headers);
        try {
            Object resp = restTemplate.postForObject(mlServiceUrl + "/pipeline/retrain", entity, Map.class);
            return ResponseEntity.accepted().body(resp);
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getResponseBodyAsString()));
        }
    }

    @GetMapping("/retrain/status")
    public ResponseEntity<Object> retrainStatus(Authentication authentication) {
        User current = userRepository.findByEmail(authentication.getName()).orElseThrow();
        if (current.getRole() == Role.ADMIN) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(restTemplate.getForObject(mlServiceUrl + "/pipeline/status", Map.class));
    }

    @PostMapping("/retrain/promote")
    public ResponseEntity<Object> retrainPromote(Authentication authentication) {
        User current = userRepository.findByEmail(authentication.getName()).orElseThrow();
        if (current.getRole() == Role.ADMIN) return ResponseEntity.status(403).build();
        try {
            return ResponseEntity.ok(restTemplate.postForObject(mlServiceUrl + "/pipeline/promote", null, Map.class));
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getResponseBodyAsString()));
        }
    }

    /** Neutralise virgules/retours ligne pour ne pas casser la structure CSV. */
    private String safe(String v) {
        if (v == null) return "";
        return v.contains(",") || v.contains("\n") || v.contains("\"")
                ? "\"" + v.replace("\"", "\"\"") + "\""
                : v;
    }
}