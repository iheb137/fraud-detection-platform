package com.tunisietelecom.frauddetection.controller;

import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.AlertStatus;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Gouvernance plateforme, reservee au SUPERADMIN.
 * Frontiere de responsabilite : sante/volumetrie/activite ici,
 * l analyse de fraude reste le metier de l ANALYSTE (pas de doublon).
 */
@RestController
@RequestMapping("/api/v1/superadmin")
@RequiredArgsConstructor
@Tag(name = "SuperAdmin", description = "Gouvernance de la plateforme")
@SecurityRequirement(name = "bearerAuth")
public class SuperAdminController {

    private final UserRepository userRepository;
    private final ImportBatchRepository importBatchRepository;
    private final CdrRepository cdrRepository;
    private final PredictionRepository predictionRepository;
    private final AlertRepository alertRepository;
    private final TicketRepository ticketRepository;
    private final InterventionRepository interventionRepository;
    private final RestTemplate restTemplate;

    private boolean forbidden(Authentication auth) {
        if (auth == null) return true; // non authentifie => 403 propre, jamais de 500
        User u = userRepository.findByEmail(auth.getName()).orElseThrow();
        return u.getRole() != Role.SUPERADMIN;
    }

    // ------- Sante plateforme : checks paralleles + cache (15 s) -------
    private final java.util.concurrent.ExecutorService healthExecutor =
            java.util.concurrent.Executors.newFixedThreadPool(3, r -> {
                Thread t = new Thread(r, "health-check");
                t.setDaemon(true);
                return t;
            });
    private volatile Map<String, Object> healthCache;
    private volatile long healthCacheAt = 0L;
    private static final long HEALTH_CACHE_TTL_MS = 15000;

    @GetMapping("/platform-health")
    @Operation(summary = "Sante des services + volumetrie globale")
    public ResponseEntity<Map<String, Object>> platformHealth(Authentication auth) {
        if (forbidden(auth)) return ResponseEntity.status(403).build();
        Map<String, Object> cached = healthCache;
        if (cached != null && System.currentTimeMillis() - healthCacheAt < HEALTH_CACHE_TTL_MS) {
            return ResponseEntity.ok(cached);
        }
        // Checks en PARALLELE, timeout strict par service : la latence totale
        // est bornee par le check le plus lent, jamais par leur somme, et la
        // panne d un service n empeche jamais d afficher les autres.
        var pgF = java.util.concurrent.CompletableFuture.supplyAsync(this::postgresHealth, healthExecutor);
        var mlF = java.util.concurrent.CompletableFuture.supplyAsync(this::mlHealth, healthExecutor);
        var kafkaF = java.util.concurrent.CompletableFuture.supplyAsync(this::kafkaHealth, healthExecutor);

        Map<String, Object> services = new LinkedHashMap<>();
        services.put("postgres", awaitOrDown(pgF, 1500));
        services.put("ml", awaitOrDown(mlF, 1500));
        services.put("kafka", awaitOrDown(kafkaF, 2500));

        Map<String, Object> volumetry = new LinkedHashMap<>();
        volumetry.put("users", userRepository.count());
        volumetry.put("activeUsers", userRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getIsActive())).count());
        volumetry.put("batches", importBatchRepository.count());
        volumetry.put("cdrs", cdrRepository.count());
        volumetry.put("predictions", predictionRepository.count());
        volumetry.put("alerts", alertRepository.count());
        volumetry.put("openAlerts", alertRepository.countByStatus(AlertStatus.OPEN));
        volumetry.put("tickets", ticketRepository.count());
        volumetry.put("interventions", interventionRepository.count());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("services", services);
        body.put("volumetry", volumetry);
        healthCache = body;
        healthCacheAt = System.currentTimeMillis();
        return ResponseEntity.ok(body);
    }

    private Map<String, Object> postgresHealth() {
        userRepository.count();
        return Map.of("status", "UP");
    }

    private Map<String, Object> awaitOrDown(java.util.concurrent.CompletableFuture<Map<String, Object>> f, long timeoutMs) {
        try {
            return f.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            f.cancel(true);
            return Map.of("status", "DOWN");
        }
    }

    @GetMapping("/users-activity")
    @Operation(summary = "Activite agregee par utilisateur")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> usersActivity(Authentication auth) {
        if (forbidden(auth)) return ResponseEntity.status(403).build();

        List<Map<String, Object>> out = userRepository.findAll().stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("fullName", u.getFirstName() + " " + u.getLastName());
            m.put("email", u.getEmail());
            m.put("role", u.getRole().name());
            m.put("isActive", u.getIsActive());
            m.put("lastLogin", u.getLastLogin());
            m.put("batchCount", importBatchRepository.countByImportedById(u.getId()));
            m.put("cdrCount", cdrRepository.countByImportBatchImportedById(u.getId()));
            m.put("openAlerts", alertRepository
                    .countByStatusAndPredictionCdrImportBatchImportedById(AlertStatus.OPEN, u.getId()));
            m.put("ticketCount", ticketRepository.countByCreatedById(u.getId()));
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(out);
    }

    @GetMapping("/recent-activity")
    @Operation(summary = "20 derniers evenements de la plateforme")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> recentActivity(Authentication auth) {
        if (forbidden(auth)) return ResponseEntity.status(403).build();
        List<Map<String, Object>> events = new ArrayList<>();

        importBatchRepository.findAll(PageRequest.of(0, 8, Sort.by("importedAt").descending()))
                .forEach(b -> events.add(event("IMPORT",
                        "Import " + b.getFilename() + " (" + b.getRecordCount() + " CDR)",
                        b.getImportedBy() != null ? b.getImportedBy().getEmail() : "?",
                        b.getImportedAt())));

        interventionRepository.findAll(PageRequest.of(0, 8, Sort.by("createdAt").descending()))
                .forEach(i -> events.add(event("INTERVENTION",
                        (i.getGroupId() != null ? "[Broadcast] " : "") + i.getTitle(),
                        i.getCreatedBy() != null ? i.getCreatedBy().getEmail() : "?",
                        i.getCreatedAt())));

        ticketRepository.findAll(PageRequest.of(0, 8, Sort.by("createdAt").descending()))
                .forEach(t -> events.add(event("TICKET",
                        t.getSubject(),
                        t.getCreatedBy() != null ? t.getCreatedBy().getEmail() : "?",
                        t.getCreatedAt())));

        events.sort((a, b) -> String.valueOf(b.get("at")).compareTo(String.valueOf(a.get("at"))));
        return ResponseEntity.ok(events.stream().limit(20).collect(Collectors.toList()));
    }

    private Map<String, Object> event(String type, String label, String by, Object at) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("type", type);
        e.put("label", label);
        e.put("by", by);
        e.put("at", at);
        return e;
    }

    private Map<String, Object> mlHealth() {
        try {
            restTemplate.getForObject("http://localhost:8000/health", Map.class);
            return Map.of("status", "UP");
        } catch (Exception e) {
            return Map.of("status", "DOWN", "error", String.valueOf(e.getMessage()));
        }
    }

    private Map<String, Object> kafkaHealth() {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, 2000);
        props.put(AdminClientConfig.CONNECTIONS_MAX_IDLE_MS_CONFIG, 3000);
        try (AdminClient client = AdminClient.create(props)) {
            int nodes = client.describeCluster().nodes().get(3, TimeUnit.SECONDS).size();
            return Map.of("status", "UP", "brokers", nodes);
        } catch (Exception e) {
            return Map.of("status", "DOWN", "error", String.valueOf(e.getMessage()));
        }
    }
}