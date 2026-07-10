package com.tunisietelecom.frauddetection.service.impl;

import com.tunisietelecom.frauddetection.domain.entity.Alert;
import com.tunisietelecom.frauddetection.domain.entity.Cdr;
import com.tunisietelecom.frauddetection.domain.entity.Prediction;
import com.tunisietelecom.frauddetection.domain.entity.SystemConfig;
import com.tunisietelecom.frauddetection.domain.enums.AlertSeverity;
import com.tunisietelecom.frauddetection.domain.enums.AlertStatus;
import com.tunisietelecom.frauddetection.domain.enums.CallDirection;
import com.tunisietelecom.frauddetection.domain.enums.CallType;
import com.tunisietelecom.frauddetection.dto.response.MlPredictResponse;
import com.tunisietelecom.frauddetection.dto.response.PredictionResponse;
import com.tunisietelecom.frauddetection.exception.ResourceNotFoundException;
import com.tunisietelecom.frauddetection.repository.AlertRepository;
import com.tunisietelecom.frauddetection.repository.CdrRepository;
import com.tunisietelecom.frauddetection.repository.PredictionRepository;
import com.tunisietelecom.frauddetection.repository.SystemConfigRepository;
import com.tunisietelecom.frauddetection.service.MlServiceClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Tests du coeur metier : upsert prediction (mort structurelle du
 * NonUniqueResultException), cycle de vie des alertes, seuil configurable.
 */
class PredictionServiceImplTest {

    private CdrRepository cdrRepository;
    private PredictionRepository predictionRepository;
    private AlertRepository alertRepository;
    private SystemConfigRepository systemConfigRepository;
    private MlServiceClient mlServiceClient;
    private PredictionServiceImpl service;

    @BeforeEach
    void setUp() {
        cdrRepository = mock(CdrRepository.class);
        predictionRepository = mock(PredictionRepository.class);
        alertRepository = mock(AlertRepository.class);
        systemConfigRepository = mock(SystemConfigRepository.class);
        mlServiceClient = mock(MlServiceClient.class);
        service = new PredictionServiceImpl(cdrRepository, predictionRepository,
                alertRepository, systemConfigRepository, mlServiceClient);
        when(systemConfigRepository.findByConfigKey("fraud_threshold"))
                .thenReturn(Optional.empty()); // defaut 0.7, surcharge par test si besoin
        when(predictionRepository.save(any(Prediction.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private Cdr cdr(long id) {
        Cdr cdr = mock(Cdr.class);
        when(cdr.getId()).thenReturn(id);
        when(cdr.getCallId()).thenReturn(UUID.randomUUID());
        when(cdr.getCallingNumber()).thenReturn("21650000001");
        when(cdr.getCalledNumber()).thenReturn("88216000001");
        when(cdr.getCallStartTime()).thenReturn(LocalDateTime.of(2026, 7, 9, 10, 0));
        when(cdr.getCallDurationSec()).thenReturn(120);
        when(cdr.getCallType()).thenReturn(CallType.VOICE);
        when(cdr.getDestinationCountry()).thenReturn("TN");
        when(cdr.getCallDirection()).thenReturn(CallDirection.OUT);
        when(cdr.getRevenue()).thenReturn(BigDecimal.ONE);
        return cdr;
    }

    private MlPredictResponse ml(double score, boolean fraud) {
        MlPredictResponse r = new MlPredictResponse();
        r.setFraudScore(score);
        r.setIsFraud(fraud);
        r.setModelVersion("v2.1");
        return r;
    }

    @Test
    @DisplayName("Nouvelle prediction : creee, alerte HIGH si score >= 0.9")
    void nouvellePredictionAvecAlerteHigh() {
        Cdr cdr = cdr(1L);
        when(cdrRepository.findById(1L)).thenReturn(Optional.of(cdr));
        when(predictionRepository.findByCdrId(1L)).thenReturn(Optional.empty());
        when(mlServiceClient.predict(any())).thenReturn(ml(0.95, true));

        PredictionResponse resp = service.analyzeOne(1L);

        assertThat(resp.getFraudScore()).isEqualByComparingTo(BigDecimal.valueOf(0.95));
        assertThat(resp.getIsFraud()).isTrue();
        verify(alertRepository).deleteByCdrId(1L);
        ArgumentCaptor<Alert> captor = ArgumentCaptor.forClass(Alert.class);
        verify(alertRepository).save(captor.capture());
        assertThat(captor.getValue().getSeverity()).isEqualTo(AlertSeverity.HIGH);
        assertThat(captor.getValue().getStatus()).isEqualTo(AlertStatus.OPEN);
    }

    @Test
    @DisplayName("Score 0.75 : alerte MEDIUM")
    void alerteMediumEntreSeuilEt09() {
        Cdr cdr = cdr(2L);
        when(cdrRepository.findById(2L)).thenReturn(Optional.of(cdr));
        when(predictionRepository.findByCdrId(2L)).thenReturn(Optional.empty());
        when(mlServiceClient.predict(any())).thenReturn(ml(0.75, true));

        service.analyzeOne(2L);

        ArgumentCaptor<Alert> captor = ArgumentCaptor.forClass(Alert.class);
        verify(alertRepository).save(captor.capture());
        assertThat(captor.getValue().getSeverity()).isEqualTo(AlertSeverity.MEDIUM);
    }

    @Test
    @DisplayName("UPSERT : re-analyse = MEME instance mise a jour, jamais de doublon")
    void upsertMetAJourLaPredictionExistante() {
        Cdr cdr = cdr(3L);
        when(cdrRepository.findById(3L)).thenReturn(Optional.of(cdr));
        Prediction existante = Prediction.builder().cdr(cdr).build();
        existante.setFraudScore(BigDecimal.valueOf(0.2));
        when(predictionRepository.findByCdrId(3L)).thenReturn(Optional.of(existante));
        when(mlServiceClient.predict(any())).thenReturn(ml(0.85, true));

        service.analyzeOne(3L);

        ArgumentCaptor<Prediction> captor = ArgumentCaptor.forClass(Prediction.class);
        verify(predictionRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue()).isSameAs(existante);
        assertThat(captor.getValue().getFraudScore())
                .isEqualByComparingTo(BigDecimal.valueOf(0.85));
    }

    @Test
    @DisplayName("Score sous le seuil : pas de nouvelle alerte, mais l ancienne est purgee")
    void sousSeuilPurgeSansRecreer() {
        Cdr cdr = cdr(4L);
        when(cdrRepository.findById(4L)).thenReturn(Optional.of(cdr));
        when(predictionRepository.findByCdrId(4L)).thenReturn(Optional.empty());
        when(mlServiceClient.predict(any())).thenReturn(ml(0.3, false));

        service.analyzeOne(4L);

        verify(alertRepository).deleteByCdrId(4L);
        verify(alertRepository, never()).save(any(Alert.class));
    }

    @Test
    @DisplayName("Seuil configurable : 0.9 en base -> score 0.8 sans alerte")
    void seuilPersonnaliseDepuisLaConfig() {
        SystemConfig config = SystemConfig.builder()
                .configKey("fraud_threshold").configValue("0.9").build();
        when(systemConfigRepository.findByConfigKey("fraud_threshold"))
                .thenReturn(Optional.of(config));
        Cdr cdr = cdr(5L);
        when(cdrRepository.findById(5L)).thenReturn(Optional.of(cdr));
        when(predictionRepository.findByCdrId(5L)).thenReturn(Optional.empty());
        when(mlServiceClient.predict(any())).thenReturn(ml(0.8, true));

        service.analyzeOne(5L);

        verify(alertRepository, never()).save(any(Alert.class));
    }

    @Test
    @DisplayName("CDR introuvable : ResourceNotFoundException")
    void cdrIntrouvable() {
        when(cdrRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.analyzeOne(99L));
        verifyNoInteractions(mlServiceClient);
    }

    @Test
    @DisplayName("analyzeBatch : compte les fraudes et survit a une erreur ML au milieu du lot")
    void analyzeBatchResilientEtComptageCorrect() {
        Cdr c1 = cdr(10L);
        Cdr c2 = cdr(11L);
        Cdr c3 = cdr(12L);
        when(cdrRepository.findByImportBatchId(5L)).thenReturn(List.of(c1, c2, c3));
        when(predictionRepository.findByCdrId(anyLong())).thenReturn(Optional.empty());
        when(mlServiceClient.predict(any()))
                .thenReturn(ml(0.9, true))
                .thenThrow(new RuntimeException("ML down"))
                .thenReturn(ml(0.2, false));

        int fraudes = service.analyzeBatch(5L);

        assertThat(fraudes).isEqualTo(1);
        verify(mlServiceClient, times(3)).predict(any());
    }
}