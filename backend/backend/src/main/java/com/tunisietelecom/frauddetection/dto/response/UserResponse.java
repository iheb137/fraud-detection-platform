package com.tunisietelecom.frauddetection.dto.response;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private Boolean isActive;
    private String profilePicture;
    private String phone;
    private String department;
    private String bio;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;
}