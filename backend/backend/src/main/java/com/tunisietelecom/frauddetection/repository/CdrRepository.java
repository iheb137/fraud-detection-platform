package com.tunisietelecom.frauddetection.repository;
import com.tunisietelecom.frauddetection.domain.entity.Cdr;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Repository
public interface CdrRepository extends JpaRepository<Cdr, Long> {
    List<Cdr> findByImportBatchId(Long batchId);
    Page<Cdr> findByImportBatchId(Long batchId, Pageable pageable);
    Page<Cdr> findAll(Pageable pageable);
    Page<Cdr> findByCallingNumberContaining(String callingNumber, Pageable pageable);
    Page<Cdr> findByImportBatchImportedById(Long userId, Pageable pageable);
    Page<Cdr> findByCallingNumberContainingAndImportBatchImportedById(String callingNumber, Long userId, Pageable pageable);
    long countByImportBatchImportedById(Long userId);
    long countByCreatedAtAfter(LocalDateTime date);
    long countByCreatedAtAfterAndImportBatchImportedById(LocalDateTime date, Long userId);
    boolean existsByCallId(java.util.UUID callId);
    @Query(value = "SELECT c.destination_country as country, COUNT(c.id) as total, " +
           "SUM(CASE WHEN p.is_fraud = true THEN 1 ELSE 0 END) as frauds " +
           "FROM cdrs c LEFT JOIN predictions p ON p.cdr_id = c.id " +
           "GROUP BY c.destination_country ORDER BY frauds DESC NULLS LAST", nativeQuery = true)
    List<Map<String, Object>> countFraudsByCountry();

    // === Analyst scope (1a) ===
    long countByImportBatchImportedByIdIn(java.util.Collection<Long> userIds);
    long countByCreatedAtAfterAndImportBatchImportedByIdIn(java.time.LocalDateTime start, java.util.Collection<Long> userIds);

    // === Statistiques scopees (1a) ===
    @org.springframework.data.jpa.repository.Query(value = "SELECT c.destination_country as country, COUNT(c.id) as total, " +
           "SUM(CASE WHEN p.is_fraud = true THEN 1 ELSE 0 END) as frauds " +
           "FROM cdrs c JOIN import_batches ib ON ib.id = c.import_batch_id " +
           "LEFT JOIN predictions p ON p.cdr_id = c.id " +
           "WHERE ib.imported_by IN (:userIds) " +
           "GROUP BY c.destination_country ORDER BY frauds DESC NULLS LAST", nativeQuery = true)
    java.util.List<java.util.Map<String, Object>> countFraudsByCountryScoped(@org.springframework.data.repository.query.Param("userIds") java.util.Collection<Long> userIds);
}