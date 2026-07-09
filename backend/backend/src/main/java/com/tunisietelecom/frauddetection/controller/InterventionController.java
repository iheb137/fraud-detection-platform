package com.tunisietelecom.frauddetection.controller;
import com.tunisietelecom.frauddetection.domain.entity.*;
import com.tunisietelecom.frauddetection.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/interventions")
@RequiredArgsConstructor
@Tag(name = "Interventions", description = "Interventions Analyste vers Admin")
@SecurityRequirement(name = "bearerAuth")
public class InterventionController {

    private final InterventionRepository interventionRepository;
    private final InterventionMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ImportBatchRepository batchRepository;
    private final CdrRepository cdrRepository;

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @PostMapping
    @Operation(summary = "Creer une intervention")
    @Transactional
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, Authentication auth) {
        User creator = getUser(auth);
        Intervention intervention = new Intervention();
        intervention.setTitle((String) body.get("title"));
        intervention.setDescription((String) body.get("description"));
        intervention.setTag((String) body.get("tag"));
        intervention.setPriority(body.getOrDefault("priority", "MEDIUM").toString());
        intervention.setStatus("PENDING");
        intervention.setCreatedBy(creator);

        // Assigner auto à l admin du batch (validation obligatoire)
        if (body.get("batchId") != null) {
            Long batchId = Long.valueOf(body.get("batchId").toString());
            var batchOpt = batchRepository.findById(batchId);
            if (batchOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Batch introuvable: " + batchId));
            }
            var b = batchOpt.get();
            intervention.setBatch(b);
            intervention.setAssignedTo(b.getImportedBy());
        }
        if (body.get("cdrId") != null) {
            Long cdrId = Long.valueOf(body.get("cdrId").toString());
            cdrRepository.findById(cdrId).ifPresent(intervention::setCdr);
        }

        Intervention saved = interventionRepository.save(intervention);
        // Message initial : la description ouvre la discussion -> declenche la notification admin
        if (saved.getDescription() != null && !saved.getDescription().isBlank()) {
            messageRepository.save(InterventionMessage.builder()
                    .intervention(saved).sender(creator)
                    .content(saved.getDescription()).isRead(false).build());
        }
        return ResponseEntity.ok(toMap(saved, creator));
    }

    @PostMapping("/broadcast")
    @Operation(summary = "Diffuser une intervention a plusieurs admins (ANALYSTE)")
    @Transactional
    public ResponseEntity<Map<String, Object>> broadcast(@RequestBody Map<String, Object> body, Authentication auth) {
        User creator = getUser(auth);
        if (!"ANALYSTE".equals(creator.getRole().name())) {
            return ResponseEntity.status(403).body(Map.of("error", "Reserve aux analystes"));
        }

        String title = (String) body.get("title");
        String description = (String) body.get("description");
        String tag = (String) body.get("tag");
        if (title == null || title.isBlank() || description == null || description.isBlank() || tag == null || tag.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "title, description et tag sont obligatoires"));
        }
        String priority = body.getOrDefault("priority", "MEDIUM").toString();

        // Resolution des cibles : liste fournie, ou tous les admins actifs si vide/absente
        List<User> activeAdmins = userRepository.findByRoleAndIsActiveTrueOrderByFirstNameAsc(
                com.tunisietelecom.frauddetection.domain.enums.Role.ADMIN);
        List<User> targets;
        Object rawIds = body.get("targetAdminIds");
        if (rawIds instanceof List<?> ids && !ids.isEmpty()) {
            Set<Long> wanted = new HashSet<>();
            for (Object o : ids) { wanted.add(Long.valueOf(o.toString())); }
            Set<Long> validIds = new HashSet<>();
            activeAdmins.forEach(a -> validIds.add(a.getId()));
            List<Long> invalid = wanted.stream().filter(id -> !validIds.contains(id)).toList();
            if (!invalid.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "IDs invalides (pas des admins actifs)", "invalidIds", invalid));
            }
            targets = activeAdmins.stream().filter(a -> wanted.contains(a.getId())).toList();
        } else {
            targets = activeAdmins;
        }
        if (targets.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Aucun admin actif cible"));
        }

        // Une copie par admin, liees par groupId : chat/badges/statuts individuels preserves
        String groupId = UUID.randomUUID().toString();
        List<Map<String, Object>> created = new ArrayList<>();
        for (User admin : targets) {
            Intervention i = new Intervention();
            i.setTitle(title);
            i.setDescription(description);
            i.setTag(tag);
            i.setPriority(priority);
            i.setStatus("PENDING");
            i.setCreatedBy(creator);
            i.setAssignedTo(admin);
            i.setGroupId(groupId);
            interventionRepository.save(i);
            // Message initial par copie -> notification pour chaque admin cible
            messageRepository.save(InterventionMessage.builder()
                    .intervention(i).sender(creator)
                    .content(description).isRead(false).build());
            created.add(Map.of("adminId", admin.getId(),
                    "fullName", admin.getFirstName() + " " + admin.getLastName()));
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("groupId", groupId);
        resp.put("createdCount", created.size());
        resp.put("targets", created);
        return ResponseEntity.ok(resp);
    }
    @GetMapping
    @Operation(summary = "Liste des interventions")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        User user = getUser(auth);
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var result = switch (user.getRole().name()) {
            case "ANALYSTE" -> interventionRepository.findByCreatedByIdOrderByCreatedAtDesc(user.getId(), pageable);
            case "ADMIN" -> interventionRepository.findByAssignedToIdOrderByCreatedAtDesc(user.getId(), pageable);
            default -> interventionRepository.findAllByOrderByCreatedAtDesc(pageable);
        };
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("content", result.getContent().stream().map(i -> toMap(i, user)).toList());
        resp.put("totalElements", result.getTotalElements());
        resp.put("totalPages", result.getTotalPages());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detail intervention avec messages")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> findById(@PathVariable Long id, Authentication auth) {
        User user = getUser(auth);
        Intervention i = interventionRepository.findById(id).orElseThrow();
        Map<String, Object> resp = toMap(i, user);
        var messages = messageRepository.findByInterventionIdOrderBySentAtAsc(id);
        resp.put("messages", messages.stream().map(this::msgToMap).toList());
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/{id}/messages")
    @Operation(summary = "Envoyer un message")
    @Transactional
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        User sender = getUser(auth);
        Intervention intervention = interventionRepository.findById(id).orElseThrow();
        InterventionMessage msg = InterventionMessage.builder()
                .intervention(intervention)
                .sender(sender)
                .content(body.get("content"))
                .isRead(false)
                .build();
        messageRepository.save(msg);
        // Mettre à jour statut si PENDING -> IN_REVIEW
        if ("PENDING".equals(intervention.getStatus())) {
            intervention.setStatus("IN_REVIEW");
            interventionRepository.save(intervention);
        }
        return ResponseEntity.ok(msgToMap(msg));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Mettre a jour le statut")
    @Transactional
    public ResponseEntity<Void> updateStatus(@PathVariable Long id, @RequestParam String status, Authentication auth) {
        interventionRepository.findById(id).ifPresent(i -> {
            i.setStatus(status);
            interventionRepository.save(i);
        });
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Marquer messages comme lus")
    @Transactional
    public ResponseEntity<Void> markAsRead(@PathVariable Long id, Authentication auth) {
        User user = getUser(auth);
        var msgs = messageRepository.findByInterventionIdOrderBySentAtAsc(id);
        msgs.stream().filter(m -> !m.getSender().getId().equals(user.getId()))
                .forEach(m -> m.setIsRead(true));
        messageRepository.saveAll(msgs);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Nombre interventions non lues")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Long>> unreadCount(Authentication auth) {
        User user = getUser(auth);
        var interventions = switch (user.getRole().name()) {
            case "ANALYSTE" -> interventionRepository.findByCreatedByIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 100));
            case "ADMIN" -> interventionRepository.findByAssignedToIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 100));
            default -> interventionRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 100));
        };
        long count = interventions.getContent().stream()
                .mapToLong(i -> messageRepository.countByInterventionIdAndIsReadFalseAndSenderIdNot(i.getId(), user.getId()))
                .sum();
        return ResponseEntity.ok(Map.of("unread", count));
    }

    private Map<String, Object> toMap(Intervention i, User currentUser) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", i.getId());
        m.put("title", i.getTitle());
        m.put("description", i.getDescription());
        m.put("tag", i.getTag());
        m.put("status", i.getStatus());
        m.put("priority", i.getPriority());
        m.put("createdBy", userMap(i.getCreatedBy()));
        m.put("assignedTo", userMap(i.getAssignedTo()));
        m.put("cdrId", i.getCdr() != null ? i.getCdr().getId() : null);
        m.put("batchId", i.getBatch() != null ? i.getBatch().getId() : null);
        m.put("groupId", i.getGroupId());
        m.put("createdAt", i.getCreatedAt());
        m.put("updatedAt", i.getUpdatedAt());
        long unread = messageRepository.countByInterventionIdAndIsReadFalseAndSenderIdNot(
                i.getId(), currentUser.getId());
        m.put("unreadCount", unread);
        return m;
    }

    private Map<String, Object> msgToMap(InterventionMessage m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("interventionId", m.getIntervention().getId());
        map.put("sender", userMap(m.getSender()));
        map.put("content", m.getContent());
        map.put("isRead", m.getIsRead());
        map.put("sentAt", m.getSentAt());
        return map;
    }

    private Map<String, Object> userMap(User u) {
        if (u == null) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("firstName", u.getFirstName());
        m.put("lastName", u.getLastName());
        m.put("email", u.getEmail());
        m.put("role", u.getRole());
        m.put("profilePicture", u.getProfilePicture());
        return m;
    }
}