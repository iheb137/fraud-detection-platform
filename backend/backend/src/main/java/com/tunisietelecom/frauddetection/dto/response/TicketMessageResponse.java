package com.tunisietelecom.frauddetection.dto.response;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class TicketMessageResponse {
    private Long id;
    private Long ticketId;
    private UserResponse sender;
    private String content;
    private Boolean isRead;
    private LocalDateTime sentAt;
}