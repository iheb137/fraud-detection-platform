package com.tunisietelecom.frauddetection.service;

import com.tunisietelecom.frauddetection.dto.response.PredictionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PredictionService {
    PredictionResponse analyzeOne(Long cdrId);
    int analyzeBatch(Long batchId);
    Page<PredictionResponse> findAll(Pageable pageable);
    PredictionResponse findById(Long id);
}