package com.tunisietelecom.frauddetection.service;

import com.tunisietelecom.frauddetection.dto.request.MlPredictRequest;
import com.tunisietelecom.frauddetection.dto.response.MlPredictResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class MlServiceClient {

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    private final RestTemplate restTemplate;

    public MlPredictResponse predict(MlPredictRequest request) {
        try {
            String url = mlServiceUrl + "/predict";
            MlPredictResponse response = restTemplate.postForObject(url, request, MlPredictResponse.class);
            log.debug("ML prediction for CDR {}: score={}", request.getCallId(), response != null ? response.getFraudScore() : "null");
            return response;
        } catch (Exception e) {
            log.error("Erreur appel ML service DETAILS: {} - {}", e.getClass().getName(), e.getMessage(), e);
            throw new RuntimeException("ML Service error: " + e.getMessage(), e);
        }
    }
}