package com.tunisietelecom.frauddetection.repository;

import com.tunisietelecom.frauddetection.domain.entity.Alert;
import com.tunisietelecom.frauddetection.domain.enums.AlertSeverity;
import com.tunisietelecom.frauddetection.domain.enums.AlertStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    long countByStatus(AlertStatus status);

    long countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus status, Long userId);

    void deleteByCdrId(Long cdrId);

    void deleteByPredictionId(Long predictionId);

    @Query(value = "SELECT a.id FROM alerts a " +
            "JOIN predictions p ON p.id = a.prediction_id " +
            "JOIN cdrs c ON c.id = p.cdr_id " +
            "JOIN import_batches ib ON ib.id = c.import_batch_id " +
            "WHERE ib.imported_by = :userId " +
            "ORDER BY a.created_at DESC",
            nativeQuery = true)
    List<Long> findAlertIdsByAdminId(@Param("userId") Long userId);

    @Query("SELECT a.severity as severity, COUNT(a) as count FROM Alert a GROUP BY a.severity")
    List<Map<String, Object>> countBySeverityGroup();

    // === Analyst scope (1a) ===
    long countByStatusAndPredictionCdrImportBatchImportedByIdIn(com.tunisietelecom.frauddetection.domain.enums.AlertStatus status, java.util.Collection<Long> userIds);

    // === Statistiques scopees (1a) ===
    @Query("SELECT a.severity as severity, COUNT(a) as count FROM Alert a " +
           "WHERE a.prediction.cdr.importBatch.importedBy.id IN :userIds GROUP BY a.severity")
    List<Map<String, Object>> countBySeverityGroupScoped(@org.springframework.data.repository.query.Param("userIds") java.util.Collection<Long> userIds);
}
