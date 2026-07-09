package com.tunisietelecom.frauddetection.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "import_batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String filename;

    @Column(name = "record_count")
    private Integer recordCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imported_by")
    private User importedBy;

    @Column(name = "imported_at")
    private LocalDateTime importedAt;

    private String status;

    @PrePersist
    protected void onCreate() {
        importedAt = LocalDateTime.now();
        if (status == null) status = "SUCCESS";
    }
}