package com.tunisietelecom.frauddetection.repository;
import com.tunisietelecom.frauddetection.domain.entity.TicketMessage;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TicketMessageRepository extends JpaRepository<TicketMessage, Long> {

    @EntityGraph(attributePaths = {"sender"})
    List<TicketMessage> findByTicketIdOrderBySentAtAsc(Long ticketId);

    long countByTicketIdAndIsReadFalseAndSenderIdNot(Long ticketId, Long senderId);
}