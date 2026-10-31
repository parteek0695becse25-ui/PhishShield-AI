package com.phishshield.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.phishshield.model.AuthSession;

public interface SessionRepository extends JpaRepository<AuthSession, Long> {
    Optional<AuthSession> findByTokenHash(String tokenHash);

    long deleteByTokenHash(String tokenHash);

    long deleteByExpiresAtBefore(Instant cutoff);
}
