package com.tunisietelecom.frauddetection.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ImportBatchResponse {
    private Long batchId;
    private String filename;
    private Integer recordCount;
    private Integer successCount;
    private Integer errorCount;
    private Integer duplicateCount;
    private String status;
    private LocalDateTime importedAt;
}