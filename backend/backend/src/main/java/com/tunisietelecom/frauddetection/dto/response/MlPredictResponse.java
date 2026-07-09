package com.tunisietelecom.frauddetection.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class MlPredictResponse {
    @JsonProperty("call_id")
    private String callId;
    @JsonProperty("fraud_score")
    private Double fraudScore;
    @JsonProperty("is_fraud")
    private Boolean isFraud;
    @JsonProperty("model_version")
    private String modelVersion;
}