package com.tunisietelecom.frauddetection.controller;

import com.tunisietelecom.frauddetection.domain.entity.Ticket;
import com.tunisietelecom.frauddetection.domain.entity.TicketMessage;
import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.dto.request.TicketMessageRequest;
import com.tunisietelecom.frauddetection.dto.request.TicketRequest;
import com.tunisietelecom.frauddetection.dto.response.TicketMessageResponse;
import com.tunisietelecom.frauddetection.dto.response.TicketResponse;
import com.tunisietelecom.frauddetection.dto.response.UserResponse;
import com.tunisietelecom.frauddetection.repository.TicketMessageRepository;
import com.tunisietelecom.frauddetection.repository.TicketRepository;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
@Tag(name = "Tickets", description = "Systeme de support et messagerie")
@SecurityRequirement(name = "bearerAuth")
public class TicketController {

    private final TicketRepository ticketRepository;
    private final TicketMessageRepository messageRepository;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Liste des tickets")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<Page<TicketResponse>> findAll(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        User user = getUser(auth);
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Ticket> tickets;
        if (user.getRole() == Role.SUPERADMIN) {
            tickets = ticketRepository.findAllByOrderByCreatedAtDesc(pageable);
        } else {
            tickets = ticketRepository.findByCreatedByIdOrderByCreatedAtDesc(user.getId(), pageable);
        }
        return ResponseEntity.ok(tickets.map(t -> toResponse(t, user)));
    }

    @PostMapping
    @Operation(summary = "Creer un ticket")
    public ResponseEntity<TicketResponse> create(Authentication auth,
            @RequestBody TicketRequest req) {
        User user = getUser(auth);
        User superAdmin = userRepository.findAll().stream()
            .filter(u -> u.getRole() == Role.SUPERADMIN)
            .findFirst().orElseThrow();
        Ticket ticket = Ticket.builder()
            .subject(req.getSubject())
            .description(req.getDescription())
            .priority(req.getPriority() != null ? req.getPriority() : "MEDIUM")
            .status("OPEN")
            .createdBy(user)
            .assignedTo(superAdmin)
            .build();
        ticketRepository.save(ticket);
        return ResponseEntity.ok(toResponse(ticket, user));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detail d un ticket avec messages")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<TicketResponse> findById(@PathVariable Long id, Authentication auth) {
        User user = getUser(auth);
        Ticket ticket = ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));
        List<TicketMessage> messages = messageRepository.findByTicketIdOrderBySentAtAsc(id);
        ticket.setMessages(messages);
        return ResponseEntity.ok(toResponseWithMessages(ticket, user));
    }

    @PostMapping("/{id}/messages")
    @Operation(summary = "Envoyer un message dans un ticket")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<TicketMessageResponse> sendMessage(
            @PathVariable Long id,
            Authentication auth,
            @RequestBody TicketMessageRequest req) {
        User user = getUser(auth);
        Ticket ticket = ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));
        TicketMessage msg = TicketMessage.builder()
            .ticket(ticket)
            .sender(user)
            .content(req.getContent())
            .isRead(false)
            .build();
        messageRepository.save(msg);
        // Si SUPERADMIN repond -> IN_PROGRESS, si user ferme -> RESOLVED
        if (user.getRole() == Role.SUPERADMIN) {
            ticket.setStatus("IN_PROGRESS");
        }
        ticketRepository.save(ticket);
        return ResponseEntity.ok(toMsgResponse(msg));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Changer le statut d un ticket")
    public ResponseEntity<TicketResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            Authentication auth) {
        User user = getUser(auth);
        Ticket ticket = ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));
        ticket.setStatus(status);
        ticketRepository.save(ticket);
        return ResponseEntity.ok(toResponse(ticket, user));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un ticket")
    @Transactional
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        Ticket ticket = ticketRepository.findById(id).orElseThrow();
        if (user.getRole().name().equals("SUPERADMIN") || ticket.getCreatedBy().getId().equals(user.getId())) {
            messageRepository.findByTicketIdOrderBySentAtAsc(id).forEach(messageRepository::delete);
            ticketRepository.delete(ticket);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.status(403).build();
    }

    @DeleteMapping("/batch")
    @Operation(summary = "Supprimer plusieurs tickets")
    @Transactional
    public ResponseEntity<Void> deleteTickets(@RequestParam List<Long> ids, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        ids.forEach(id -> {
            ticketRepository.findById(id).ifPresent(ticket -> {
                if (user.getRole().name().equals("SUPERADMIN") || ticket.getCreatedBy().getId().equals(user.getId())) {
                    messageRepository.findByTicketIdOrderBySentAtAsc(id).forEach(messageRepository::delete);
                    ticketRepository.delete(ticket);
                }
            });
        });
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Nombre de messages non lus")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<java.util.Map<String, Long>> getUnreadCount(Authentication auth) {
        User user = getUser(auth);
        // Pour SUPERADMIN: tickets OPEN non lus
        // Pour ADMIN/ANALYSTE: tickets avec reponses non lues du SUPERADMIN
        Page<Ticket> tickets;
        PageRequest all = PageRequest.of(0, 1000);
        if (user.getRole() == Role.SUPERADMIN) {
            tickets = ticketRepository.findAllByOrderByCreatedAtDesc(all);
        } else {
            tickets = ticketRepository.findByCreatedByIdOrderByCreatedAtDesc(user.getId(), all);
        }
        long count = tickets.getContent().stream()
            .mapToLong(t -> messageRepository
                .countByTicketIdAndIsReadFalseAndSenderIdNot(t.getId(), user.getId()))
            .sum();
        return ResponseEntity.ok(java.util.Map.of("unread", count));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Marquer messages comme lus")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> markAsRead(@PathVariable Long id, Authentication auth) {
        User user = getUser(auth);
        List<TicketMessage> msgs = messageRepository.findByTicketIdOrderBySentAtAsc(id);
        msgs.stream()
            .filter(m -> !m.getSender().getId().equals(user.getId()))
            .forEach(m -> m.setIsRead(true));
        messageRepository.saveAll(msgs);
        return ResponseEntity.ok().build();
    }

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private UserResponse toUserResponse(User u) {
        if (u == null) return null;
        return UserResponse.builder()
            .id(u.getId()).email(u.getEmail())
            .firstName(u.getFirstName()).lastName(u.getLastName())
            .role(u.getRole().name()).isActive(u.getIsActive())
            .profilePicture(u.getProfilePicture())
            .build();
    }

    private TicketMessageResponse toMsgResponse(TicketMessage m) {
        return TicketMessageResponse.builder()
            .id(m.getId())
            .ticketId(m.getTicket().getId())
            .sender(toUserResponse(m.getSender()))
            .content(m.getContent())
            .isRead(m.getIsRead())
            .sentAt(m.getSentAt())
            .build();
    }

    private TicketResponse toResponse(Ticket t, User currentUser) {
        // Ne pas acceder aux messages ici (lazy) - seulement dans findById
        long unread = messageRepository.countByTicketIdAndIsReadFalseAndSenderIdNot(
            t.getId(), currentUser.getId());
        return TicketResponse.builder()
            .id(t.getId())
            .subject(t.getSubject())
            .description(t.getDescription())
            .priority(t.getPriority())
            .status(t.getStatus())
            .createdBy(toUserResponse(t.getCreatedBy()))
            .assignedTo(toUserResponse(t.getAssignedTo()))
            .messages(null)
            .unreadCount(unread)
            .createdAt(t.getCreatedAt())
            .updatedAt(t.getUpdatedAt())
            .build();
    }

    private TicketResponse toResponseWithMessages(Ticket t, User currentUser) {
        List<TicketMessage> msgs = t.getMessages() != null ? t.getMessages() : List.of();
        return TicketResponse.builder()
            .id(t.getId())
            .subject(t.getSubject())
            .description(t.getDescription())
            .priority(t.getPriority())
            .status(t.getStatus())
            .createdBy(toUserResponse(t.getCreatedBy()))
            .assignedTo(toUserResponse(t.getAssignedTo()))
            .messages(msgs.stream().map(this::toMsgResponse).collect(Collectors.toList()))
            .unreadCount(0)
            .createdAt(t.getCreatedAt())
            .updatedAt(t.getUpdatedAt())
            .build();
    }
}
