package com.tunisietelecom.frauddetection.service;

import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.dto.response.CdrResponse;
import com.tunisietelecom.frauddetection.dto.response.ImportBatchResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface CdrService {
    ImportBatchResponse importCsv(MultipartFile file, Long userId);
    Page<CdrResponse> findAll(Pageable pageable, String callingNumber, String callType, User currentUser);
    CdrResponse findById(Long id);
}