package com.tunisietelecom.frauddetection.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tunisietelecom.frauddetection.domain.entity.Cdr;
import com.tunisietelecom.frauddetection.domain.entity.ImportBatch;
import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.CallDirection;
import com.tunisietelecom.frauddetection.domain.enums.CallType;
import com.tunisietelecom.frauddetection.repository.CdrRepository;
import com.tunisietelecom.frauddetection.repository.ImportBatchRepository;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Ingestion temps reel des CDR depuis Kafka (topic cdr-stream).
 * - Chaque CDR est rattache a un batch virtuel STREAMING_<date> (admin systeme id=1)
 *   -> tout l existant (scope analyste, stats, alertes, dataset, retrain) fonctionne sans modification.
 * - Idempotent : doublon call_id -> skip (contrainte UNIQUE en defense ultime),
 *   re-analyse -> upsert (logique analyzeCdr existante).
 * - Un CDR malforme est logge et ignore : le listener ne meurt jamais.
 * - Kafka down -> la plateforme batch fonctionne normalement (couplage faible).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaConsumerService {

    private final CdrRepository cdrRepository;
    private final ImportBatchRepository importBatchRepository;
    private final UserRepository userRepository;
    private final PredictionService predictionService;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Long STREAM_ADMIN_ID = 1L;

    @KafkaListener(topics = "cdr-stream", groupId = "fraud-platform")
    @Transactional
    public void consume(String message) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String rawCallId = json.path("call_id").asText(null);
            if (rawCallId == null || rawCallId.isBlank()) {
                log.warn("[kafka] Message sans call_id ignore");
                return;
            }
            UUID callId = UUID.fromString(rawCallId);

            if (cdrRepository.existsByCallId(callId)) {
                log.info("[kafka] CDR deja connu, skip: {}", callId);
                return;
            }

            ImportBatch batch = resolveStreamingBatch();

            Cdr cdr = new Cdr();
            cdr.setCallId(callId);
            cdr.setCallingNumber(json.path("calling_number").asText(""));
            cdr.setCalledNumber(json.path("called_number").asText(""));
            cdr.setCallStartTime(LocalDateTime.parse(json.path("call_start_time").asText(), FMT));
            cdr.setCallDurationSec(json.path("call_duration_sec").asInt(0));
            cdr.setCallType(CallType.valueOf(json.path("call_type").asText("VOICE")));
            cdr.setDestinationCountry(json.path("destination_country").asText("TN"));
            cdr.setCallDirection(CallDirection.valueOf(json.path("call_direction").asText("OUT")));
            cdr.setImei(json.path("imei").asText(null));
            cdr.setCellId(json.path("cell_id").asText(null));
            cdr.setRevenue(BigDecimal.valueOf(json.path("revenue").asDouble(0.0)));
            cdr.setImportBatch(batch);
            cdr.setCreatedAt(LocalDateTime.now());
            cdr = cdrRepository.save(cdr);

            batch.setRecordCount((batch.getRecordCount() == null ? 0 : batch.getRecordCount()) + 1);
            importBatchRepository.save(batch);

            // Analyse ML immediate : prediction + alerte si score >= seuil (upsert = idempotent)
            predictionService.analyzeOne(cdr.getId());
            log.info("[kafka] CDR {} ingere et analyse (batch {})", callId, batch.getId());

        } catch (IllegalArgumentException e) {
            log.warn("[kafka] CDR malforme ignore: {}", e.getMessage());
        } catch (Exception e) {
            log.error("[kafka] Erreur ingestion: {} - {}", e.getClass().getSimpleName(), e.getMessage());
        }
    }

    /** Batch virtuel du jour, cree a la volee au premier CDR streame. */
    private ImportBatch resolveStreamingBatch() {
        String name = "STREAMING_" + LocalDate.now();
        return importBatchRepository.findFirstByFilenameOrderByIdDesc(name).orElseGet(() -> {
            User admin = userRepository.findById(STREAM_ADMIN_ID).orElseThrow();
            ImportBatch b = new ImportBatch();
            b.setFilename(name);
            b.setRecordCount(0);
            b.setImportedBy(admin);
            b.setImportedAt(LocalDateTime.now());
            b.setStatus("COMPLETED");
            log.info("[kafka] Creation du batch virtuel {}", name);
            return importBatchRepository.save(b);
        });
    }
}