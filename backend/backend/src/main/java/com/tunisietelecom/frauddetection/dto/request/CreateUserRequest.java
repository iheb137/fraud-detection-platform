package com.tunisietelecom.frauddetection.dto.request;
import lombok.Data;

@Data
public class CreateUserRequest {
    private String email;
    private String password;
    private String firstName;
    private String lastName;
    private String role;
    private String phone;
    private String department;
}