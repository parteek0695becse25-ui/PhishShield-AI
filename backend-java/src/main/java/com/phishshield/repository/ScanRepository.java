package com.phishshield.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.phishshield.model.ScanRecord;

public interface ScanRepository extends JpaRepository<ScanRecord, Long> {

    List<ScanRecord> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Optional<ScanRecord> findByIdAndUserId(Long id, Long userId);

    long deleteByIdAndUserId(Long id, Long userId);

    /** Rows of [scanType, riskLevel, count, averageScore] computed by the database. */
    @Query("select s.scanType, s.riskLevel, count(s), avg(s.riskScore) from ScanRecord s "
            + "where s.userId = :userId group by s.scanType, s.riskLevel")
    List<Object[]> aggregate(@Param("userId") Long userId);
}
