package com.tunisietelecom.frauddetection.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AlertResponse {
    private Long id;
    private Long cdrId;
    private String callId;
    private String callingNumber;
    private Double fraudScore;
    private String severity;
    private String status;
    private LocalDateTime createdAt;
    private String resolutionNote;
}