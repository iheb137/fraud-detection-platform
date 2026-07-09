package com.tunisietelecom.frauddetection.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class CdrResponse {
    private Long id;
    private String callId;
    private String callingNumber;
    private String calledNumber;
    private LocalDateTime callStartTime;
    private Integer callDurationSec;
    private String callType;
    private String destinationCountry;
    private String callDirection;
    private BigDecimal revenue;
    private LocalDateTime createdAt;
}