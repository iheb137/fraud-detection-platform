package com.tunisietelecom.frauddetection.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MlPredictRequest {
    @JsonProperty("call_id")
    private String callId;
    @JsonProperty("calling_number")
    private String callingNumber;
    @JsonProperty("called_number")
    private String calledNumber;
    @JsonProperty("call_start_time")
    private String callStartTime;
    @JsonProperty("call_duration_sec")
    private Integer callDurationSec;
    @JsonProperty("call_type")
    private String callType;
    @JsonProperty("destination_country")
    private String destinationCountry;
    @JsonProperty("call_direction")
    private String callDirection;
    private String imei;
    @JsonProperty("cell_id")
    private String cellId;
    private Double revenue;
}