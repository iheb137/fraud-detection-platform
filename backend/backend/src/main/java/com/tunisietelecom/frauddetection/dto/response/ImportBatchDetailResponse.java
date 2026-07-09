package com.tunisietelecom.frauddetection.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ImportBatchDetailResponse {
    private Long id;
    private String filename;
    private Integer recordCount;
    private String status;
    private String importedBy;
    private LocalDateTime importedAt;
    private Long fraudCount;
    private Long analyzedCount;
}