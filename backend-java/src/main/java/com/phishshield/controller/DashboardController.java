package com.phishshield.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.phishshield.config.AuthInterceptor;
import com.phishshield.dto.Dtos.DashboardStats;
import com.phishshield.model.AppUser;
import com.phishshield.service.DashboardService;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService dashboard;

    public DashboardController(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @GetMapping("/stats")
    public DashboardStats stats(@RequestAttribute(AuthInterceptor.USER_ATTR) AppUser user) {
        return dashboard.stats(user.getId());
    }
}
