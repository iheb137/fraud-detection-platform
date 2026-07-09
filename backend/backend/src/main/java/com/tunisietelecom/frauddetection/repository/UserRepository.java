package com.tunisietelecom.frauddetection.repository;

import com.tunisietelecom.frauddetection.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    // === Analyst scope (1a) ===
    java.util.List<User> findByRoleAndIsActiveTrueOrderByFirstNameAsc(com.tunisietelecom.frauddetection.domain.enums.Role role);
}