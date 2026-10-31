package com.phishshield.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.phishshield.config.AuthInterceptor;
import com.phishshield.dto.Dtos.AuthResponse;
import com.phishshield.dto.Dtos.LoginRequest;
import com.phishshield.dto.Dtos.RegisterRequest;
import com.phishshield.dto.Dtos.UserDto;
import com.phishshield.model.AppUser;
import com.phishshield.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return auth.register(req.name(), req.email(), req.password());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req.email(), req.password());
    }

    @GetMapping("/me")
    public UserDto me(@RequestAttribute(AuthInterceptor.USER_ATTR) AppUser user) {
        return AuthService.toDto(user);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestAttribute(AuthInterceptor.TOKEN_ATTR) String token) {
        auth.logout(token);
    }
}
