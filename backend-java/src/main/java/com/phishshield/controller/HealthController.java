package com.phishshield.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.phishshield.repository.UserRepository;
import com.phishshield.service.EngineClient;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    private final EngineClient engine;
    private final UserRepository users;

    public HealthController(EngineClient engine, UserRepository users) {
        this.engine = engine;
        this.users = users;
    }

    @GetMapping
    public Map<String, Object> health() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("backend", "UP");
        boolean db;
        try {
            users.count();
            db = true;
        } catch (RuntimeException e) {
            db = false;
        }
        boolean eng = engine.isHealthy();
        m.put("database", db ? "UP" : "DOWN");
        m.put("detectionEngine", eng ? "UP" : "DOWN");
        m.put("status", db && eng ? "UP" : "DEGRADED");
        return m;
    }
}
