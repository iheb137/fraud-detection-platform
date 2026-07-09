package com.tunisietelecom.frauddetection.domain.entity;

import com.tunisietelecom.frauddetection.domain.enums.CallDirection;
import com.tunisietelecom.frauddetection.domain.enums.CallType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cdrs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cdr {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "call_id", unique = true, nullable = false)
    private UUID callId;

    @Column(name = "calling_number", nullable = false)
    private String callingNumber;

    @Column(name = "called_number", nullable = false)
    private String calledNumber;

    @Column(name = "call_start_time", nullable = false)
    private LocalDateTime callStartTime;

    @Column(name = "call_duration_sec")
    private Integer callDurationSec;

    @Enumerated(EnumType.STRING)
    @Column(name = "call_type", nullable = false)
    private CallType callType;

    @Column(name = "destination_country")
    private String destinationCountry;

    @Enumerated(EnumType.STRING)
    @Column(name = "call_direction")
    private CallDirection callDirection;

    private String imei;

    @Column(name = "cell_id")
    private String cellId;

    private BigDecimal revenue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_batch_id")
    private ImportBatch importBatch;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (callId == null) callId = UUID.randomUUID();
    }
}