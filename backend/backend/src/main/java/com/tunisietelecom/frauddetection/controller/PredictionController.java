package com.tunisietelecom.frauddetection.controller;

import com.tunisietelecom.frauddetection.dto.response.PredictionResponse;
import com.tunisietelecom.frauddetection.service.PredictionService;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.exception.ResourceNotFoundException;
import com.tunisietelecom.frauddetection.repository.PredictionRepository;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/predictions")
@RequiredArgsConstructor
@Tag(name = "Predictions", description = "Analyse ML des CDR")
@SecurityRequirement(name = "bearerAuth")
public class PredictionController {

    private final PredictionService predictionService;
    private final PredictionRepository predictionRepository;
    private final UserRepository userRepository;

    @PostMapping("/analyze/{cdrId}")
    @Operation(summary = "Analyser un CDR unique")
    public ResponseEntity<PredictionResponse> analyzeOne(@PathVariable Long cdrId) {
        return ResponseEntity.ok(predictionService.analyzeOne(cdrId));
    }

    @PostMapping("/analyze-batch/{batchId}")
    @Operation(summary = "Analyser tous les CDR d un batch")
    public ResponseEntity<Map<String, Object>> analyzeBatch(@PathVariable Long batchId) {
        int fraudCount = predictionService.analyzeBatch(batchId);
        return ResponseEntity.ok(Map.of(
                "batchId", batchId,
                "fraudCount", fraudCount,
                "status", "completed"
        ));
    }

    /**
     * Verite terrain analyste : confirme (true) ou infirme (false) une prediction.
     * C est ce label - pas la sortie du modele - qui alimentera le reentrainement (Phase 2).
     * Reserve a l ANALYSTE : acte metier, pas d administration.
     */
    @PutMapping("/{id}/label")
    @Operation(summary = "Labelliser une prediction (verite terrain)")
    @Transactional
    public ResponseEntity<Map<String, Object>> labelPrediction(
            @PathVariable Long id,
            @RequestParam Boolean label,
            Authentication auth) {
        var user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() != Role.ANALYSTE) {
            return ResponseEntity.status(403).build();
        }
        var p = predictionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prediction not found: " + id));
        p.setAnalystLabel(label);
        p.setLabeledBy(user);
        p.setLabeledAt(java.time.LocalDateTime.now());
        predictionRepository.save(p);
        return ResponseEntity.ok(Map.of(
                "id", p.getId(),
                "analystLabel", p.getAnalystLabel(),
                "labeledAt", p.getLabeledAt().toString()));
    }
    @GetMapping
    @Operation(summary = "Liste des predictions")
    public ResponseEntity<Page<PredictionResponse>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("predictedAt").descending());
        return ResponseEntity.ok(predictionService.findAll(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detail d une prediction")
    public ResponseEntity<PredictionResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(predictionService.findById(id));
    }
}