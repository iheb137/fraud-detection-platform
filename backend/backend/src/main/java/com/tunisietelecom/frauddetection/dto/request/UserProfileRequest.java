package com.tunisietelecom.frauddetection.dto.request;
import lombok.Data;

@Data
public class UserProfileRequest {
    private String firstName;
    private String lastName;
    private String phone;
    private String department;
    private String bio;
    private String profilePicture;
}