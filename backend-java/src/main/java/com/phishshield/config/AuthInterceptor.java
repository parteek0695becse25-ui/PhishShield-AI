package com.phishshield.config;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.phishshield.exception.ApiException;
import com.phishshield.model.AppUser;
import com.phishshield.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Requires "Authorization: Bearer <token>" on protected endpoints. */
@Component
public class AuthInterceptor implements HandlerInterceptor {
    public static final String USER_ATTR = "phishshield.user";
    public static final String TOKEN_ATTR = "phishshield.token";

    private final AuthService auth;

    public AuthInterceptor(AuthService auth) {
        this.auth = auth;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String header = request.getHeader("Authorization");
        String token = (header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)) ? header.substring(7).trim() : null;
        AppUser user = auth.authenticate(token);
        request.setAttribute(USER_ATTR, user);
        request.setAttribute(TOKEN_ATTR, token);
        return true;
    }
}
