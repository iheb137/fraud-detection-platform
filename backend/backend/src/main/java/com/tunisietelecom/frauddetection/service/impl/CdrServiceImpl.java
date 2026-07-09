package com.tunisietelecom.frauddetection.service.impl;

import com.opencsv.CSVReader;
import com.tunisietelecom.frauddetection.domain.entity.Cdr;
import com.tunisietelecom.frauddetection.domain.entity.ImportBatch;
import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.CallDirection;
import com.tunisietelecom.frauddetection.domain.enums.CallType;
import com.tunisietelecom.frauddetection.dto.response.CdrResponse;
import com.tunisietelecom.frauddetection.dto.response.ImportBatchResponse;
import com.tunisietelecom.frauddetection.exception.ResourceNotFoundException;
import com.tunisietelecom.frauddetection.repository.CdrRepository;
import com.tunisietelecom.frauddetection.repository.ImportBatchRepository;
import com.tunisietelecom.frauddetection.repository.UserRepository;
import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import com.tunisietelecom.frauddetection.service.CdrService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CdrServiceImpl implements CdrService {

    private final CdrRepository cdrRepository;
    private final ImportBatchRepository importBatchRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public ImportBatchResponse importCsv(MultipartFile file, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ImportBatch batch = ImportBatch.builder()
                .filename(file.getOriginalFilename())
                .importedBy(user)
                .importedAt(LocalDateTime.now())
                .status("PROCESSING")
                .build();
        batch = importBatchRepository.save(batch);

        List<Cdr> cdrs = new ArrayList<>();
        int errorCount = 0;
        int duplicateCount = 0;

        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream()))) {
            List<String[]> rows = reader.readAll();
            for (int i = 1; i < rows.size(); i++) {
                try {
                    String[] row = rows.get(i);
                    Cdr cdr = parseCdrRow(row, batch);
                    if (cdrRepository.existsByCallId(cdr.getCallId())) {
                        log.info("CDR deja existant, ignore: {}", cdr.getCallId());
                        duplicateCount++;
                        continue;
                    }
                    cdrs.add(cdr);
                } catch (Exception e) {
                    log.warn("Erreur ligne {}: {}", i, e.getMessage());
                    errorCount++;
                }
            }
            cdrRepository.saveAll(cdrs);
            batch.setRecordCount(cdrs.size());
            batch.setStatus("SUCCESS");
        } catch (Exception e) {
            log.error("Erreur import CSV: {}", e.getMessage());
            batch.setStatus("FAILED");
            batch.setRecordCount(0);
        }

        importBatchRepository.save(batch);

        return ImportBatchResponse.builder()
                .batchId(batch.getId())
                .filename(batch.getFilename())
                .recordCount(batch.getRecordCount())
                .successCount(cdrs.size())
                .errorCount(errorCount)
                .duplicateCount(duplicateCount)
                .status(batch.getStatus())
                .importedAt(batch.getImportedAt())
                .build();
    }

    @Override
    public Page<CdrResponse> findAll(Pageable pageable, String callingNumber, String callType, User currentUser) {
        // ADMIN voit seulement ses CDR
        if (currentUser.getRole() == Role.ADMIN) {
            if (callingNumber != null && !callingNumber.isEmpty()) {
                return cdrRepository.findByCallingNumberContainingAndImportBatchImportedById(
                    callingNumber, currentUser.getId(), pageable).map(this::toResponse);
            }
            return cdrRepository.findByImportBatchImportedById(currentUser.getId(), pageable)
                .map(this::toResponse);
        }
        // ANALYSTE et SUPERADMIN voient tout
        if (callingNumber != null && !callingNumber.isEmpty()) {
            return cdrRepository.findByCallingNumberContaining(callingNumber, pageable)
                .map(this::toResponse);
        }
        return cdrRepository.findAll(pageable).map(this::toResponse);
    }

    @Override
    public CdrResponse findById(Long id) {
        Cdr cdr = cdrRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CDR not found with id: " + id));
        return toResponse(cdr);
    }

    private Cdr parseCdrRow(String[] row, ImportBatch batch) {
        return Cdr.builder()
                .callId(UUID.fromString(row[0].trim()))
                .callingNumber(row[1].trim())
                .calledNumber(row[2].trim())
                .callStartTime(LocalDateTime.parse(row[3].trim(),
                        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .callDurationSec(Integer.parseInt(row[4].trim()))
                .callType(CallType.valueOf(row[5].trim().toUpperCase()))
                .destinationCountry(row[6].trim())
                .callDirection(CallDirection.valueOf(row[7].trim().toUpperCase()))
                .imei(row.length > 8 ? row[8].trim() : null)
                .cellId(row.length > 9 ? row[9].trim() : null)
                .revenue(row.length > 10 ? new BigDecimal(row[10].trim()) : BigDecimal.ZERO)
                .importBatch(batch)
                .build();
    }

    private CdrResponse toResponse(Cdr cdr) {
        return CdrResponse.builder()
                .id(cdr.getId())
                .callId(cdr.getCallId().toString())
                .callingNumber(cdr.getCallingNumber())
                .calledNumber(cdr.getCalledNumber())
                .callStartTime(cdr.getCallStartTime())
                .callDurationSec(cdr.getCallDurationSec())
                .callType(cdr.getCallType().name())
                .destinationCountry(cdr.getDestinationCountry())
                .callDirection(cdr.getCallDirection() != null ? cdr.getCallDirection().name() : null)
                .revenue(cdr.getRevenue())
                .createdAt(cdr.getCreatedAt())
                .build();
    }
}