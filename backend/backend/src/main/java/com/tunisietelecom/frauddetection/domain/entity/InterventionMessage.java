package com.tunisietelecom.frauddetection.domain.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "intervention_messages")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class InterventionMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "intervention_id")
    private Intervention intervention;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "is_read")
    private Boolean isRead = false;

    private LocalDateTime sentAt;

    @PrePersist
    void prePersist() { sentAt = LocalDateTime.now(); if (isRead == null) isRead = false; }
}