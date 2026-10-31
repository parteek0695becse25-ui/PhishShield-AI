package com.phishshield.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "scans", indexes = @Index(name = "idx_scans_user_created", columnList = "user_id, created_at"))
public class ScanRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "scan_type", nullable = false, length = 16)
    private String scanType;

    @Column(name = "input_text", nullable = false, length = 6000)
    private String inputText;

    @Column(name = "risk_score", nullable = false)
    private int riskScore;

    @Column(name = "risk_level", nullable = false, length = 16)
    private String riskLevel;

    /** JSON array of indicator objects. */
    @Column(name = "indicators", nullable = false, length = 60000)
    private String indicators;

    @Column(name = "explanation", nullable = false, length = 2000)
    private String explanation;

    /** JSON array of strings. */
    @Column(name = "recommendations", nullable = false, length = 20000)
    private String recommendations;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getScanType() { return scanType; }
    public void setScanType(String scanType) { this.scanType = scanType; }
    public String getInputText() { return inputText; }
    public void setInputText(String inputText) { this.inputText = inputText; }
    public int getRiskScore() { return riskScore; }
    public void setRiskScore(int riskScore) { this.riskScore = riskScore; }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    public String getIndicators() { return indicators; }
    public void setIndicators(String indicators) { this.indicators = indicators; }
    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }
    public String getRecommendations() { return recommendations; }
    public void setRecommendations(String recommendations) { this.recommendations = recommendations; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
