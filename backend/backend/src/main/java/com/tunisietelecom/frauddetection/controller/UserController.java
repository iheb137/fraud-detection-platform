package com.tunisietelecom.frauddetection.controller;

import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.dto.request.CreateUserRequest;
import com.tunisietelecom.frauddetection.dto.request.UserProfileRequest;
import com.tunisietelecom.frauddetection.dto.response.UserResponse;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import com.tunisietelecom.frauddetection.repository.TicketRepository;
import com.tunisietelecom.frauddetection.repository.TicketMessageRepository;
import com.tunisietelecom.frauddetection.repository.InterventionRepository;
import com.tunisietelecom.frauddetection.repository.InterventionMessageRepository;
import com.tunisietelecom.frauddetection.repository.ImportBatchRepository;
import com.tunisietelecom.frauddetection.repository.CdrRepository;
import com.tunisietelecom.frauddetection.repository.PredictionRepository;
import com.tunisietelecom.frauddetection.repository.AlertRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Gestion des utilisateurs")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final TicketMessageRepository ticketMessageRepository;
    private final InterventionRepository interventionRepository;
    private final InterventionMessageRepository interventionMessageRepository;
    private final ImportBatchRepository importBatchRepository;
    private final CdrRepository cdrRepository;
    private final PredictionRepository predictionRepository;
    private final AlertRepository alertRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/me")
    @Operation(summary = "Profil de l utilisateur connecte")
    public ResponseEntity<UserResponse> getMe(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(toResponse(user));
    }

    @PutMapping("/me")
    @Operation(summary = "Modifier son profil")
    public ResponseEntity<UserResponse> updateMe(Authentication auth,
            @RequestBody UserProfileRequest req) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (req.getFirstName() != null) user.setFirstName(req.getFirstName());
        if (req.getLastName() != null) user.setLastName(req.getLastName());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getDepartment() != null) user.setDepartment(req.getDepartment());
        if (req.getBio() != null) user.setBio(req.getBio());
        if (req.getProfilePicture() != null) user.setProfilePicture(req.getProfilePicture());
        userRepository.save(user);
        return ResponseEntity.ok(toResponse(user));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPERADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Liste tous les utilisateurs")
    public ResponseEntity<List<UserResponse>> findAll() {
        return ResponseEntity.ok(userRepository.findAll()
            .stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Creer un utilisateur (SUPERADMIN uniquement)")
    public ResponseEntity<UserResponse> createUser(@RequestBody CreateUserRequest req) {
        User user = User.builder()
            .email(req.getEmail())
            .password(passwordEncoder.encode(req.getPassword()))
            .firstName(req.getFirstName())
            .lastName(req.getLastName())
            .role(Role.valueOf(req.getRole()))
            .phone(req.getPhone())
            .department(req.getDepartment())
            .isActive(true)
            .build();
        userRepository.save(user);
        return ResponseEntity.ok(toResponse(user));
    }

    @PutMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Activer/Desactiver un compte")
    public ResponseEntity<UserResponse> toggleActive(@PathVariable Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsActive(!user.getIsActive());
        userRepository.save(user);
        return ResponseEntity.ok(toResponse(user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Supprimer un utilisateur")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        // 1. Supprimer messages des interventions creees par ou assignees a cet user
        interventionRepository.findByCreatedByIdOrderByCreatedAtDesc(id, org.springframework.data.domain.PageRequest.of(0, 1000))
            .getContent().forEach(i -> interventionMessageRepository.deleteByInterventionId(i.getId()));
        interventionRepository.findByAssignedToIdOrderByCreatedAtDesc(id, org.springframework.data.domain.PageRequest.of(0, 1000))
            .getContent().forEach(i -> interventionMessageRepository.deleteByInterventionId(i.getId()));
        // 2. Supprimer les interventions
        interventionRepository.findByCreatedByIdOrderByCreatedAtDesc(id, org.springframework.data.domain.PageRequest.of(0, 1000))
            .getContent().forEach(i -> interventionRepository.delete(i));
        interventionRepository.findByAssignedToIdOrderByCreatedAtDesc(id, org.springframework.data.domain.PageRequest.of(0, 1000))
            .getContent().forEach(i -> interventionRepository.delete(i));
        // 3. Supprimer messages des tickets
        ticketRepository.findByCreatedByIdOrderByCreatedAtDesc(id, org.springframework.data.domain.PageRequest.of(0, 1000))
            .getContent().forEach(t -> {
                ticketMessageRepository.findByTicketIdOrderBySentAtAsc(t.getId())
                    .forEach(m -> ticketMessageRepository.delete(m));
                ticketRepository.delete(t);
            });
        // 4. Supprimer batches et leurs donnees
        importBatchRepository.findByImportedByIdOrderByImportedAtDesc(id, org.springframework.data.domain.PageRequest.of(0, 1000)).getContent().forEach(b -> {
            cdrRepository.findByImportBatchId(b.getId()).forEach(cdr -> {
                alertRepository.deleteByCdrId(cdr.getId());
                predictionRepository.deleteByCdrId(cdr.getId());
                cdrRepository.delete(cdr);
            });
            importBatchRepository.delete(b);
        });
        // 5. Supprimer l utilisateur
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/superadmin/dashboard")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Dashboard SUPERADMIN")
    public ResponseEntity<java.util.Map<String, Object>> getSuperAdminDashboard() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.findAll().stream()
            .filter(u -> Boolean.TRUE.equals(u.getIsActive())).count();
        long admins = userRepository.findAll().stream()
            .filter(u -> u.getRole() == Role.ADMIN).count();
        long analystes = userRepository.findAll().stream()
            .filter(u -> u.getRole() == Role.ANALYSTE).count();
        java.util.Map<String, Object> dashboard = new java.util.LinkedHashMap<>();
        dashboard.put("totalUsers", totalUsers);
        dashboard.put("activeUsers", activeUsers);
        dashboard.put("admins", admins);
        dashboard.put("analystes", analystes);
        dashboard.put("users", userRepository.findAll().stream()
            .filter(u -> u.getRole() != Role.SUPERADMIN)
            .map(this::toResponse).collect(Collectors.toList()));
        return ResponseEntity.ok(dashboard);
    }

    private UserResponse toResponse(User u) {
        return UserResponse.builder()
            .id(u.getId())
            .email(u.getEmail())
            .firstName(u.getFirstName())
            .lastName(u.getLastName())
            .role(u.getRole().name())
            .isActive(u.getIsActive())
            .profilePicture(u.getProfilePicture())
            .phone(u.getPhone())
            .department(u.getDepartment())
            .bio(u.getBio())
            .lastLogin(u.getLastLogin())
            .createdAt(u.getCreatedAt())
            .build();
    }
}