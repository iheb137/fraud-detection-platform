package com.tunisietelecom.frauddetection.repository;
import com.tunisietelecom.frauddetection.domain.entity.ImportBatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ImportBatchRepository extends JpaRepository<ImportBatch, Long> {

    @EntityGraph(attributePaths = {"importedBy"})
    @Query("SELECT b FROM ImportBatch b ORDER BY b.importedAt DESC")
    Page<ImportBatch> findAllOrderByImportedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"importedBy"})
    @Query("SELECT b FROM ImportBatch b WHERE b.importedBy.id = :userId ORDER BY b.importedAt DESC")
    Page<ImportBatch> findByImportedByIdOrderByImportedAtDesc(@org.springframework.data.repository.query.Param("userId") Long userId, Pageable pageable);

    // === Analyst scope (1a) ===
    long countByImportedById(Long userId);

    // === Ingestion Kafka : lookup du batch virtuel du jour ===
    java.util.Optional<ImportBatch> findFirstByFilenameOrderByIdDesc(String filename);
}