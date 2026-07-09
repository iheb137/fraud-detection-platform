package com.tunisietelecom.frauddetection.repository;
import com.tunisietelecom.frauddetection.domain.entity.InterventionMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InterventionMessageRepository extends JpaRepository<InterventionMessage, Long> {
    List<InterventionMessage> findByInterventionIdOrderBySentAtAsc(Long interventionId);
    long countByInterventionIdAndIsReadFalseAndSenderIdNot(Long interventionId, Long senderId);
    void deleteByInterventionId(Long interventionId);
}