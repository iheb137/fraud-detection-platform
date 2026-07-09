package com.tunisietelecom.frauddetection.repository;

import com.tunisietelecom.frauddetection.domain.entity.Prediction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface PredictionRepository extends JpaRepository<Prediction, Long> {

    long countByIsFraudTrue();

    @EntityGraph(attributePaths = {"cdr"})
    Page<Prediction> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"cdr"})
    Page<Prediction> findByIsFraudTrue(Pageable pageable);

    boolean existsByCdrId(Long cdrId);

    boolean existsByCdrIdAndIsFraudTrue(Long cdrId);

    java.util.List<com.tunisietelecom.frauddetection.domain.entity.Prediction> findAllByCdrId(Long cdrId);

    void deleteByCdrId(Long cdrId);
    Optional<Prediction> findByCdrId(Long cdrId);

    long countByPredictedAtBetween(LocalDateTime start, LocalDateTime end);
    long countByIsFraudTrueAndPredictedAtBetween(LocalDateTime start, LocalDateTime end);
    long countByPredictedAtAfter(LocalDateTime start);
    long countByIsFraudTrueAndPredictedAtAfter(LocalDateTime start);

    // FiltrÃ©s par admin (importedBy)
    long countByPredictedAtAfterAndCdrImportBatchImportedById(LocalDateTime start, Long userId);
    long countByIsFraudTrueAndPredictedAtAfterAndCdrImportBatchImportedById(LocalDateTime start, Long userId);
    long countByPredictedAtBetweenAndCdrImportBatchImportedById(LocalDateTime start, LocalDateTime end, Long userId);
    long countByIsFraudTrueAndPredictedAtBetweenAndCdrImportBatchImportedById(LocalDateTime start, LocalDateTime end, Long userId);
    @org.springframework.data.jpa.repository.Query("SELECT p FROM Prediction p WHERE p.cdr.importBatch.importedBy.id = :userId ORDER BY p.fraudScore DESC")
    org.springframework.data.domain.Page<Prediction> findByCdrImportBatchImportedById(@org.springframework.data.repository.query.Param("userId") Long userId, org.springframework.data.domain.Pageable pageable);

    @Query(value = "SELECT EXTRACT(HOUR FROM predicted_at) as hour, COUNT(*) as total, " +
           "SUM(CASE WHEN is_fraud = true THEN 1 ELSE 0 END) as frauds " +
           "FROM predictions GROUP BY EXTRACT(HOUR FROM predicted_at) ORDER BY hour", nativeQuery = true)
    List<Map<String, Object>> countFraudsByHour();

    long countByCdrImportBatchId(Long batchId);
    long countByCdrImportBatchIdAndIsFraudTrue(Long batchId);

    // === Analyst scope (1a) ===
    long countByCdrImportBatchImportedById(Long userId);
    long countByIsFraudTrueAndCdrImportBatchImportedById(Long userId);
    long countByCdrImportBatchImportedByIdIn(java.util.Collection<Long> userIds);
    long countByIsFraudTrueAndCdrImportBatchImportedByIdIn(java.util.Collection<Long> userIds);
    long countByPredictedAtBetweenAndCdrImportBatchImportedByIdIn(java.time.LocalDateTime start, java.time.LocalDateTime end, java.util.Collection<Long> userIds);
    long countByIsFraudTrueAndPredictedAtBetweenAndCdrImportBatchImportedByIdIn(java.time.LocalDateTime start, java.time.LocalDateTime end, java.util.Collection<Long> userIds);
    long countByPredictedAtAfterAndCdrImportBatchImportedByIdIn(java.time.LocalDateTime start, java.util.Collection<Long> userIds);
    long countByIsFraudTrueAndPredictedAtAfterAndCdrImportBatchImportedByIdIn(java.time.LocalDateTime start, java.util.Collection<Long> userIds);

    @Query("SELECT p FROM Prediction p WHERE p.cdr.importBatch.importedBy.id IN :userIds ORDER BY p.fraudScore DESC")
    Page<Prediction> findByCdrImportBatchImportedByIdIn(@org.springframework.data.repository.query.Param("userIds") java.util.Collection<Long> userIds, Pageable pageable);

    // === Statistiques scopees (1a) ===
    @Query(value = "SELECT EXTRACT(HOUR FROM p.predicted_at) as hour, COUNT(*) as total, " +
           "SUM(CASE WHEN p.is_fraud = true THEN 1 ELSE 0 END) as frauds " +
           "FROM predictions p JOIN cdrs c ON c.id = p.cdr_id " +
           "JOIN import_batches ib ON ib.id = c.import_batch_id " +
           "WHERE ib.imported_by IN (:userIds) " +
           "GROUP BY EXTRACT(HOUR FROM p.predicted_at) ORDER BY hour", nativeQuery = true)
    List<Map<String, Object>> countFraudsByHourScoped(@org.springframework.data.repository.query.Param("userIds") java.util.Collection<Long> userIds);

    // === Dataset ML (1c) : une seule requete, relations chargees d avance ===
    @Query("SELECT p FROM Prediction p JOIN FETCH p.cdr c JOIN FETCH c.importBatch ib JOIN FETCH ib.importedBy WHERE ib.importedBy.id IN :userIds ORDER BY p.id")
    List<Prediction> findDatasetScoped(@org.springframework.data.repository.query.Param("userIds") java.util.Collection<Long> userIds);

    @Query("SELECT p FROM Prediction p JOIN FETCH p.cdr c JOIN FETCH c.importBatch ib JOIN FETCH ib.importedBy ORDER BY p.id")
    List<Prediction> findDatasetAll();

    // === Rapport analyste (1c) : top numeros frauduleux du perimetre ===
    @Query(value = "SELECT c.calling_number AS number, COUNT(*) AS frauds, MAX(p.fraud_score) AS max_score " +
           "FROM predictions p JOIN cdrs c ON c.id = p.cdr_id JOIN import_batches ib ON ib.id = c.import_batch_id " +
           "WHERE p.is_fraud = true AND ib.imported_by IN (:userIds) " +
           "GROUP BY c.calling_number ORDER BY frauds DESC LIMIT 10", nativeQuery = true)
    List<Map<String, Object>> topFraudNumbersScoped(@org.springframework.data.repository.query.Param("userIds") java.util.Collection<Long> userIds);
}
