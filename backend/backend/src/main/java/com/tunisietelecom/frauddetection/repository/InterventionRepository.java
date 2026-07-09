package com.tunisietelecom.frauddetection.repository;
import com.tunisietelecom.frauddetection.domain.entity.Intervention;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InterventionRepository extends JpaRepository<Intervention, Long> {
    Page<Intervention> findByCreatedByIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    Page<Intervention> findByAssignedToIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    Page<Intervention> findAllByOrderByCreatedAtDesc(Pageable pageable);
    long countByAssignedToIdAndStatus(Long userId, String status);
    List<Intervention> findByBatchId(Long batchId);

    // === Broadcast (1b) ===
    java.util.List<Intervention> findByGroupIdOrderByAssignedToFirstNameAsc(String groupId);
}