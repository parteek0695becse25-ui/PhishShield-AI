package com.phishshield.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.phishshield.dto.Dtos.DashboardStats;
import com.phishshield.dto.Dtos.ScanSummary;
import com.phishshield.dto.Dtos.TypeStats;
import com.phishshield.repository.ScanRepository;

/** Every number here is computed from rows in the scans table. */
@Service
public class DashboardService {
    private final ScanRepository scans;
    private final ScanService scanService;

    public DashboardService(ScanRepository scans, ScanService scanService) {
        this.scans = scans;
        this.scanService = scanService;
    }

    @Transactional(readOnly = true)
    public DashboardStats stats(Long userId) {
        Map<String, Long> distribution = new LinkedHashMap<>();
        for (String level : List.of("LOW", "MEDIUM", "HIGH", "CRITICAL")) {
            distribution.put(level, 0L);
        }
        long[] typeTotal = new long[2];      // 0 = MESSAGE, 1 = URL
        long[] typeFlagged = new long[2];
        double[] typeScoreSum = new double[2];
        double scoreSum = 0;
        long total = 0;

        for (Object[] row : scans.aggregate(userId)) {
            String type = (String) row[0];
            String level = (String) row[1];
            long count = ((Number) row[2]).longValue();
            double avg = row[3] == null ? 0 : ((Number) row[3]).doubleValue();
            int idx = "URL".equals(type) ? 1 : 0;

            distribution.merge(level, count, Long::sum);
            total += count;
            scoreSum += avg * count;
            typeTotal[idx] += count;
            typeScoreSum[idx] += avg * count;
            if ("HIGH".equals(level) || "CRITICAL".equals(level)) {
                typeFlagged[idx] += count;
            }
        }

        List<ScanSummary> recent = scans.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 5))
                .stream().map(scanService::toSummary).toList();

        long high = distribution.get("HIGH") + distribution.get("CRITICAL");
        return new DashboardStats(total, high, distribution.get("MEDIUM"), distribution.get("LOW"),
                total == 0 ? 0 : round1(scoreSum / total),
                typeStats(typeTotal[0], typeFlagged[0], typeScoreSum[0]),
                typeStats(typeTotal[1], typeFlagged[1], typeScoreSum[1]),
                distribution, recent);
    }

    private static TypeStats typeStats(long total, long flagged, double scoreSum) {
        return new TypeStats(total, flagged, total == 0 ? 0 : round1(scoreSum / total));
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
