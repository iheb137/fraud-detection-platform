package com.tunisietelecom.frauddetection.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tunisietelecom.frauddetection.domain.entity.Cdr;
import com.tunisietelecom.frauddetection.domain.entity.ImportBatch;
import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.repository.CdrRepository;
import com.tunisietelecom.frauddetection.repository.ImportBatchRepository;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Tests d idempotence et de robustesse du consumer Kafka
 * (decision d architecture : listener immortel, doublon = skip, batch virtuel STREAMING_).
 */
class KafkaConsumerServiceTest {

    private CdrRepository cdrRepository;
    private ImportBatchRepository importBatchRepository;
    private UserRepository userRepository;
    private PredictionService predictionService;
    private KafkaConsumerService service;

    @BeforeEach
    void setUp() {
        cdrRepository = mock(CdrRepository.class);
        importBatchRepository = mock(ImportBatchRepository.class);
        userRepository = mock(UserRepository.class);
        predictionService = mock(PredictionService.class);
        service = new KafkaConsumerService(cdrRepository, importBatchRepository,
                userRepository, predictionService, new ObjectMapper());
    }

    private String validMessage(String callId) {
        return "{\"call_id\":\"" + callId + "\",\"calling_number\":\"21650000001\","
                + "\"called_number\":\"88216000001\",\"call_start_time\":\"2026-07-09 10:00:00\","
                + "\"call_duration_sec\":120,\"call_type\":\"VOICE\",\"destination_country\":\"TN\","
                + "\"call_direction\":\"OUT\",\"revenue\":1.5}";
    }

    private Cdr stubSavedCdr(long id) {
        Cdr saved = mock(Cdr.class);
        when(saved.getId()).thenReturn(id);
        when(cdrRepository.save(any(Cdr.class))).thenReturn(saved);
        return saved;
    }

    @Test
    @DisplayName("Nominal : CDR persiste, batch incremente, analyse ML declenchee")
    void nominalPersisteEtAnalyse() {
        UUID callId = UUID.randomUUID();
        when(cdrRepository.existsByCallId(callId)).thenReturn(false);
        ImportBatch batch = new ImportBatch();
        batch.setRecordCount(3);
        when(importBatchRepository.findFirstByFilenameOrderByIdDesc(anyString()))
                .thenReturn(Optional.of(batch));
        stubSavedCdr(42L);

        service.consume(validMessage(callId.toString()));

        verify(cdrRepository).save(any(Cdr.class));
        assertThat(batch.getRecordCount()).isEqualTo(4);
        verify(importBatchRepository).save(batch);
        verify(predictionService).analyzeOne(42L);
    }

    @Test
    @DisplayName("Batch virtuel STREAMING_ cree a la volee au premier CDR du jour")
    void creeLeBatchVirtuelSiAbsent() {
        when(cdrRepository.existsByCallId(any(UUID.class))).thenReturn(false);
        when(importBatchRepository.findFirstByFilenameOrderByIdDesc(anyString()))
                .thenReturn(Optional.empty());
        when(userRepository.findById(1L)).thenReturn(Optional.of(mock(User.class)));
        when(importBatchRepository.save(any(ImportBatch.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        stubSavedCdr(1L);

        service.consume(validMessage(UUID.randomUUID().toString()));

        ArgumentCaptor<ImportBatch> captor = ArgumentCaptor.forClass(ImportBatch.class);
        verify(importBatchRepository, times(2)).save(captor.capture());
        assertThat(captor.getAllValues().get(0).getFilename()).startsWith("STREAMING_");
        assertThat(captor.getAllValues().get(0).getStatus()).isEqualTo("COMPLETED");
    }

    @Test
    @DisplayName("Doublon call_id : skip total (idempotence)")
    void doublonSkip() {
        UUID callId = UUID.randomUUID();
        when(cdrRepository.existsByCallId(callId)).thenReturn(true);

        service.consume(validMessage(callId.toString()));

        verify(cdrRepository, never()).save(any(Cdr.class));
        verify(predictionService, never()).analyzeOne(anyLong());
    }

    @Test
    @DisplayName("Message sans call_id : ignore sans toucher la base")
    void sansCallIdIgnore() {
        service.consume("{}");
        verifyNoInteractions(predictionService);
        verify(cdrRepository, never()).save(any(Cdr.class));
    }

    @Test
    @DisplayName("call_id non-UUID : ignore, listener survit")
    void callIdInvalideIgnore() {
        assertDoesNotThrow(() -> service.consume(validMessage("pas-un-uuid").replace("\"pas-un-uuid\"", "\"pas-un-uuid\"")));
        service.consume("{\"call_id\":\"pas-un-uuid\"}");
        verify(cdrRepository, never()).save(any(Cdr.class));
    }

    @Test
    @DisplayName("call_type inconnu : CDR malforme ignore")
    void callTypeInconnuIgnore() {
        UUID callId = UUID.randomUUID();
        when(cdrRepository.existsByCallId(callId)).thenReturn(false);
        String msg = validMessage(callId.toString()).replace("VOICE", "FAX");

        assertDoesNotThrow(() -> service.consume(msg));
        verify(cdrRepository, never()).save(any(Cdr.class));
    }

    @Test
    @DisplayName("JSON illisible : ignore, listener survit")
    void jsonIllisibleIgnore() {
        assertDoesNotThrow(() -> service.consume("ceci n est pas du json"));
        verify(cdrRepository, never()).save(any(Cdr.class));
    }

    @Test
    @DisplayName("Exception du service ML : capturee, le listener ne meurt jamais")
    void erreurMlNeTuePasLeListener() {
        UUID callId = UUID.randomUUID();
        when(cdrRepository.existsByCallId(callId)).thenReturn(false);
        ImportBatch batch = new ImportBatch();
        batch.setRecordCount(0);
        when(importBatchRepository.findFirstByFilenameOrderByIdDesc(anyString()))
                .thenReturn(Optional.of(batch));
        stubSavedCdr(9L);
        when(predictionService.analyzeOne(9L)).thenThrow(new RuntimeException("ML down"));

        assertDoesNotThrow(() -> service.consume(validMessage(callId.toString())));
    }
}