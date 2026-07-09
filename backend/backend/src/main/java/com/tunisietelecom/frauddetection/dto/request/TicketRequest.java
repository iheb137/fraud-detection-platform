package com.tunisietelecom.frauddetection.dto.request;
import lombok.Data;

@Data
public class TicketRequest {
    private String subject;
    private String description;
    private String priority;
}