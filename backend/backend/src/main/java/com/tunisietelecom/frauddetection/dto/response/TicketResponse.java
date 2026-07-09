package com.tunisietelecom.frauddetection.dto.response;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TicketResponse {
    private Long id;
    private String subject;
    private String description;
    private String priority;
    private String status;
    private UserResponse createdBy;
    private UserResponse assignedTo;
    private List<TicketMessageResponse> messages;
    private long unreadCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}