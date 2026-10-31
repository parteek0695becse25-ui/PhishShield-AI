package com.phishshield.service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.phishshield.dto.Dtos.EngineResult;
import com.phishshield.dto.Dtos.Indicator;
import com.phishshield.dto.Dtos.ScanResponse;
import com.phishshield.dto.Dtos.ScanSummary;
import com.phishshield.exception.ApiException;
import com.phishshield.model.ScanRecord;
import com.phishshield.repository.ScanRepository;

@Service
public class ScanService {
    private static final Map<String, Object> ENGINE_INFO = engineInfo();
    private static final String DISCLAIMER = "This result comes from rule-based heuristics, not a trained machine-learning "
            + "model, and it is not a probability of fraud. False positives and false negatives are possible. "
            + "When in doubt, contact the organisation using an official number or app that you already trust.";

    private final ScanRepository scans;
    private final EngineClient engine;
    private final ObjectMapper mapper;

    public ScanService(ScanRepository scans, EngineClient engine, ObjectMapper mapper) {
        this.scans = scans;
        this.engine = engine;
        this.mapper = mapper;
    }

    public ScanResponse scanMessage(Long userId, String text) {
        String clean = text.strip();
        return save(userId, "MESSAGE", clean, engine.analyzeMessage(clean));
    }

    public ScanResponse scanUrl(Long userId, String url) {
        String clean = url.strip();
        return save(userId, "URL", clean, engine.analyzeUrl(clean));
    }

    @Transactional(readOnly = true)
    public List<ScanSummary> list(Long userId, String type, String level, String query, int limit) {
        String t = type == null ? "" : type.trim().toUpperCase(Locale.ROOT);
        String l = level == null ? "" : level.trim().toUpperCase(Locale.ROOT);
        String q = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        int max = Math.max(1, Math.min(limit, 500));
        return scans.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 500)).stream()
                .filter(s -> t.isEmpty() || s.getScanType().equals(t))
                .filter(s -> l.isEmpty() || s.getRiskLevel().equals(l))
                .filter(s -> q.isEmpty() || s.getInputText().toLowerCase(Locale.ROOT).contains(q))
                .limit(max)
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public ScanResponse get(Long userId, Long id) {
        return toResponse(scans.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Scan " + id + " was not found.")));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        if (scans.deleteByIdAndUserId(id, userId) == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Scan " + id + " was not found.");
        }
    }

    // ---------------------------------------------------------------

    private ScanResponse save(Long userId, String type, String input, EngineResult result) {
        int score = Math.max(0, Math.min(100, result.riskScore()));
        ScanRecord rec = new ScanRecord();
        rec.setUserId(userId);
        rec.setScanType(type);
        rec.setInputText(input);
        rec.setRiskScore(score);
        rec.setRiskLevel(levelFor(score));
        rec.setExplanation(truncate(result.summary() == null ? "" : result.summary(), 2000));
        try {
            rec.setIndicators(mapper.writeValueAsString(result.indicators() == null ? List.of() : result.indicators()));
            rec.setRecommendations(mapper.writeValueAsString(result.recommendations() == null ? List.of() : result.recommendations()));
        } catch (JsonProcessingException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store the scan result.");
        }
        rec.setCreatedAt(Instant.now());
        ScanRecord saved = scans.save(rec);
        ScanResponse response = toResponse(saved);
        return new ScanResponse(response.id(), response.scanType(), response.inputText(), response.riskScore(),
                response.riskLevel(), response.indicators(), response.explanation(), response.recommendations(),
                response.createdAt(), result.engine() != null ? result.engine() : ENGINE_INFO,
                result.disclaimer() != null ? result.disclaimer() : DISCLAIMER, result.notice());
    }

    private ScanResponse toResponse(ScanRecord r) {
        return new ScanResponse(r.getId(), r.getScanType(), r.getInputText(), r.getRiskScore(), r.getRiskLevel(),
                readList(r.getIndicators(), new TypeReference<List<Indicator>>() { }), r.getExplanation(),
                readList(r.getRecommendations(), new TypeReference<List<String>>() { }), r.getCreatedAt(),
                ENGINE_INFO, DISCLAIMER,
                "URL".equals(r.getScanType())
                        ? "The URL was analysed as text only. It was never opened and was not checked against a live threat-intelligence database."
                        : null);
    }

    public ScanSummary toSummary(ScanRecord r) {
        String flat = r.getInputText().replaceAll("\\s+", " ");
        String preview = flat.length() > 110 ? flat.substring(0, 110) + "..." : flat;
        int count = readList(r.getIndicators(), new TypeReference<List<Indicator>>() { }).size();
        return new ScanSummary(r.getId(), r.getScanType(), preview, r.getRiskScore(), r.getRiskLevel(), count, r.getCreatedAt());
    }

    private <T> List<T> readList(String json, TypeReference<List<T>> type) {
        try {
            return mapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    public static String levelFor(int score) {
        if (score >= 75) return "CRITICAL";
        if (score >= 50) return "HIGH";
        if (score >= 25) return "MEDIUM";
        return "LOW";
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 3) + "...";
    }

    private static Map<String, Object> engineInfo() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", "PhishShield rule engine");
        m.put("method", "rule-based heuristics");
        m.put("machine_learning", false);
        m.put("threat_intelligence_lookup", false);
        return m;
    }
}
