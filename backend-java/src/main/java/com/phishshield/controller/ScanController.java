package com.phishshield.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.phishshield.config.AuthInterceptor;
import com.phishshield.dto.Dtos.MessageScanRequest;
import com.phishshield.dto.Dtos.ScanResponse;
import com.phishshield.dto.Dtos.ScanSummary;
import com.phishshield.dto.Dtos.UrlScanRequest;
import com.phishshield.model.AppUser;
import com.phishshield.service.ScanService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/scans")
public class ScanController {
    private final ScanService scans;

    public ScanController(ScanService scans) {
        this.scans = scans;
    }

    @PostMapping("/message")
    @ResponseStatus(HttpStatus.CREATED)
    public ScanResponse scanMessage(@RequestAttribute(AuthInterceptor.USER_ATTR) AppUser user,
                                    @Valid @RequestBody MessageScanRequest req) {
        return scans.scanMessage(user.getId(), req.text());
    }

    @PostMapping("/url")
    @ResponseStatus(HttpStatus.CREATED)
    public ScanResponse scanUrl(@RequestAttribute(AuthInterceptor.USER_ATTR) AppUser user,
                                @Valid @RequestBody UrlScanRequest req) {
        return scans.scanUrl(user.getId(), req.url());
    }

    @GetMapping
    public List<ScanSummary> list(@RequestAttribute(AuthInterceptor.USER_ATTR) AppUser user,
                                  @RequestParam(required = false) String type,
                                  @RequestParam(required = false) String level,
                                  @RequestParam(name = "q", required = false) String query,
                                  @RequestParam(defaultValue = "200") int limit) {
        return scans.list(user.getId(), type, level, query, limit);
    }

    @GetMapping("/{id}")
    public ScanResponse get(@RequestAttribute(AuthInterceptor.USER_ATTR) AppUser user, @PathVariable Long id) {
        return scans.get(user.getId(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestAttribute(AuthInterceptor.USER_ATTR) AppUser user, @PathVariable Long id) {
        scans.delete(user.getId(), id);
    }
}
