package com.tunisietelecom.frauddetection.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "predictions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cdr_id")
    private Cdr cdr;

    @Column(name = "fraud_score", nullable = false)
    private BigDecimal fraudScore;

    @Column(name = "is_fraud", nullable = false)
    private Boolean isFraud;

    @Column(name = "model_version")
    private String modelVersion;

    @Column(name = "predicted_at")
    private LocalDateTime predictedAt;

    @Column(name = "analyst_label")
    private Boolean analystLabel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "labeled_by")
    private User labeledBy;

    @Column(name = "labeled_at")
    private LocalDateTime labeledAt;

    @PrePersist
    protected void onCreate() {
        predictedAt = LocalDateTime.now();
    }
}