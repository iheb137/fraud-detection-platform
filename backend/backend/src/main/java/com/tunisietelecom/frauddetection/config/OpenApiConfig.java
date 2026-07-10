package com.tunisietelecom.frauddetection.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI fraudDetectionOpenApi() {
        SecurityScheme bearer = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("Jeton JWT obtenu via POST /api/v1/auth/login");
        return new OpenAPI()
                .info(new Info()
                        .title("Fraud Detection Platform API")
                        .description("API de la plateforme de detection des appels frauduleux - Tunisie Telecom DSI")
                        .version("1.0")
                        .contact(new Contact().name("Iheb Eddine Saafi - TEK-UP")))
                .components(new Components().addSecuritySchemes("bearerAuth", bearer))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}