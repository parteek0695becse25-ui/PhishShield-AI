package com.phishshield.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** All request / response shapes in one place. */
public final class Dtos {
    private Dtos() {
    }

    // ---------- requests ----------
    public record RegisterRequest(
            @NotBlank(message = "Please enter your name.") @Size(max = 80, message = "Name must be at most 80 characters.") String name,
            @NotBlank(message = "Please enter your email.") @Email(message = "Please enter a valid email address.")
            @Size(max = 160, message = "Email is too long.") String email,
            @NotBlank(message = "Please choose a password.") @Size(min = 8, max = 100, message = "Password must be 8 to 100 characters.") String password) {
    }

    public record LoginRequest(
            @NotBlank(message = "Please enter your email.") String email,
            @NotBlank(message = "Please enter your password.") String password) {
    }

    public record MessageScanRequest(
            @NotBlank(message = "Please paste a message to scan.") @Size(max = 5000, message = "Message must be at most 5000 characters.") String text) {
    }

    public record UrlScanRequest(
            @NotBlank(message = "Please enter a URL to scan.") @Size(max = 2048, message = "URL must be at most 2048 characters.") String url) {
    }

    // ---------- auth responses ----------
    public record UserDto(Long id, String name, String email) {
    }

    public record AuthResponse(String token, UserDto user, Instant expiresAt) {
    }

    // ---------- engine ----------
    public record Indicator(String name, String severity, String explanation, String evidence,
                            String recommendation, Integer weight) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EngineResult(
            @JsonProperty("scan_type") String scanType,
            @JsonProperty("risk_score") Integer riskScore,
            @JsonProperty("risk_level") String riskLevel,
            String summary,
            List<Indicator> indicators,
            List<String> recommendations,
            Map<String, Object> engine,
            String disclaimer,
            @JsonProperty("links_found") List<String> linksFound,
            @JsonProperty("url_details") Map<String, Object> urlDetails,
            String notice) {
    }

    // ---------- scan responses ----------
    public record ScanResponse(Long id, String scanType, String inputText, int riskScore, String riskLevel,
                               List<Indicator> indicators, String explanation, List<String> recommendations,
                               Instant createdAt, Map<String, Object> engine, String disclaimer, String notice) {
    }

    public record ScanSummary(Long id, String scanType, String preview, int riskScore, String riskLevel,
                              int indicatorCount, Instant createdAt) {
    }

    // ---------- dashboard ----------
    public record TypeStats(long total, long flagged, double averageScore) {
    }

    public record DashboardStats(long totalScans, long highRiskScans, long mediumRiskScans, long lowRiskScans,
                                 double averageScore, TypeStats messageScans, TypeStats urlScans,
                                 Map<String, Long> riskDistribution, List<ScanSummary> recentScans) {
    }
}
