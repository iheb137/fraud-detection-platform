package com.tunisietelecom.frauddetection.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PredictionResponse {
    private Long id;
    private Long cdrId;
    private String callId;
    private BigDecimal fraudScore;
    private Boolean isFraud;
    private String modelVersion;
    private LocalDateTime predictedAt;
    private Boolean analystLabel;
}