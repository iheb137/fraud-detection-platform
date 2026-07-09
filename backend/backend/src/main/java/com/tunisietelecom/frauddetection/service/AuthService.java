package com.tunisietelecom.frauddetection.service;

import com.tunisietelecom.frauddetection.dto.request.LoginRequest;
import com.tunisietelecom.frauddetection.dto.request.RegisterRequest;
import com.tunisietelecom.frauddetection.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request);
    AuthResponse register(RegisterRequest request);
    AuthResponse refreshToken(String refreshToken);
}