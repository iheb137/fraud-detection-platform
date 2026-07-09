package com.tunisietelecom.frauddetection.service.impl;

import com.tunisietelecom.frauddetection.domain.entity.Alert;
import com.tunisietelecom.frauddetection.domain.entity.Cdr;
import com.tunisietelecom.frauddetection.domain.entity.Prediction;
import com.tunisietelecom.frauddetection.domain.enums.AlertSeverity;
import com.tunisietelecom.frauddetection.domain.enums.AlertStatus;
import com.tunisietelecom.frauddetection.dto.request.MlPredictRequest;
import com.tunisietelecom.frauddetection.dto.response.MlPredictResponse;
import com.tunisietelecom.frauddetection.dto.response.PredictionResponse;
import com.tunisietelecom.frauddetection.exception.ResourceNotFoundException;
import com.tunisietelecom.frauddetection.repository.AlertRepository;
import com.tunisietelecom.frauddetection.repository.CdrRepository;
import com.tunisietelecom.frauddetection.repository.PredictionRepository;
import com.tunisietelecom.frauddetection.repository.SystemConfigRepository;
import com.tunisietelecom.frauddetection.service.MlServiceClient;
import com.tunisietelecom.frauddetection.service.PredictionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PredictionServiceImpl implements PredictionService {

    private final CdrRepository cdrRepository;
    private final PredictionRepository predictionRepository;
    private final AlertRepository alertRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final MlServiceClient mlServiceClient;

    private static final double DEFAULT_THRESHOLD = 0.7;

    @Override
    @Transactional
    public PredictionResponse analyzeOne(Long cdrId) {
        Cdr cdr = cdrRepository.findById(cdrId)
                .orElseThrow(() -> new ResourceNotFoundException("CDR not found: " + cdrId));
        Prediction prediction = analyzeCdr(cdr, getThreshold());
        return toResponse(prediction, cdr);
    }

    @Override
    @Transactional
    public int analyzeBatch(Long batchId) {
        List<Cdr> cdrs = cdrRepository.findByImportBatchId(batchId);
        double threshold = getThreshold(); // hors boucle : 1 requete au lieu de N
        int fraudCount = 0;
        for (Cdr cdr : cdrs) {
            try {
                Prediction p = analyzeCdr(cdr, threshold);
                if (p.getFraudScore().doubleValue() >= threshold) {
                    fraudCount++;
                }
            } catch (Exception e) {
                log.error("Erreur analyse CDR {}: {} - {}", cdr.getId(),
                        e.getClass().getSimpleName(), e.getMessage());
            }
        }
        log.info("Batch {} analyse: {}/{} fraudes detectees", batchId, fraudCount, cdrs.size());
        return fraudCount;
    }

    /**
     * Logique d analyse unique, partagee par analyzeOne et analyzeBatch.
     * UPSERT : la prediction existante est mise a jour, jamais dupliquee
     * (contrainte UNIQUE sur predictions.cdr_id en defense ultime).
     * L alerte est rafraichie : l ancienne correspondait a un ancien score,
     * la re-analyse reinitialise donc son cycle de vie (decision metier).
     */
    private Prediction analyzeCdr(Cdr cdr, double threshold) {
        MlPredictRequest request = buildRequest(cdr);
        MlPredictResponse mlResponse = mlServiceClient.predict(request);

        Prediction prediction = predictionRepository.findByCdrId(cdr.getId())
                .orElseGet(() -> Prediction.builder().cdr(cdr).build());
        prediction.setFraudScore(BigDecimal.valueOf(mlResponse.getFraudScore()));
        prediction.setIsFraud(mlResponse.getIsFraud());
        prediction.setModelVersion(mlResponse.getModelVersion());
        prediction.setPredictedAt(LocalDateTime.now());
        prediction = predictionRepository.save(prediction);

        // Supprimer l alerte AVANT d en recreer une (FK alerts -> predictions)
        alertRepository.deleteByCdrId(cdr.getId());
        if (mlResponse.getFraudScore() >= threshold) {
            createAlert(cdr, prediction, mlResponse.getFraudScore());
        }
        return prediction;
    }

    @Override
    public Page<PredictionResponse> findAll(Pageable pageable) {
        return predictionRepository.findAll(pageable)
                .map(p -> toResponse(p, p.getCdr()));
    }

    @Override
    public PredictionResponse findById(Long id) {
        Prediction prediction = predictionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prediction not found: " + id));
        return toResponse(prediction, prediction.getCdr());
    }

    private MlPredictRequest buildRequest(Cdr cdr) {
        return MlPredictRequest.builder()
                .callId(cdr.getCallId().toString())
                .callingNumber(cdr.getCallingNumber())
                .calledNumber(cdr.getCalledNumber())
                .callStartTime(cdr.getCallStartTime().toString())
                .callDurationSec(cdr.getCallDurationSec())
                .callType(cdr.getCallType().name())
                .destinationCountry(cdr.getDestinationCountry())
                .callDirection(cdr.getCallDirection() != null ? cdr.getCallDirection().name() : "OUT")
                .imei(cdr.getImei())
                .cellId(cdr.getCellId())
                .revenue(cdr.getRevenue() != null ? cdr.getRevenue().doubleValue() : 0.0)
                .build();
    }

    private void createAlert(Cdr cdr, Prediction prediction, double score) {
        AlertSeverity severity = score >= 0.9 ? AlertSeverity.HIGH
                : score >= 0.7 ? AlertSeverity.MEDIUM
                : AlertSeverity.LOW;

        Alert alert = Alert.builder()
                .prediction(prediction)
                .cdr(cdr)
                .severity(severity)
                .status(AlertStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        alertRepository.save(alert);
        log.info("Alerte creee pour CDR {} avec score {}", cdr.getId(), score);
    }

    private double getThreshold() {
        return systemConfigRepository.findByConfigKey("fraud_threshold")
                .map(c -> Double.parseDouble(c.getConfigValue()))
                .orElse(DEFAULT_THRESHOLD);
    }

    private PredictionResponse toResponse(Prediction p, Cdr cdr) {
        return PredictionResponse.builder()
                .id(p.getId())
                .cdrId(cdr.getId())
                .callId(cdr.getCallId().toString())
                .fraudScore(p.getFraudScore())
                .isFraud(p.getIsFraud())
                .modelVersion(p.getModelVersion())
                .predictedAt(p.getPredictedAt())
                .analystLabel(p.getAnalystLabel())
                .build();
    }
}