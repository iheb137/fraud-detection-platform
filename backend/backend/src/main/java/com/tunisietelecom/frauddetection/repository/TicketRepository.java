package com.tunisietelecom.frauddetection.repository;
import com.tunisietelecom.frauddetection.domain.entity.Ticket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    @EntityGraph(attributePaths = {"createdBy", "assignedTo"})
    Page<Ticket> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"createdBy", "assignedTo"})
    Page<Ticket> findByCreatedByIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByStatus(String status);

    // === Superadmin : activite par utilisateur ===
    long countByCreatedById(Long userId);
}