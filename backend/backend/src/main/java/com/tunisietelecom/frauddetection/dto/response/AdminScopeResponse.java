package com.tunisietelecom.frauddetection.dto.response;

import lombok.Builder;
import lombok.Data;

/**
 * Volumetrie d un admin, pour le selecteur de perimetre de l analyste.
 */
@Data
@Builder
public class AdminScopeResponse {
    private Long id;
    private String fullName;
    private String email;
    private long batchCount;
    private long cdrCount;
    private long openAlertCount;
}