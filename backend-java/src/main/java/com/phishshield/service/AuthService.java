package com.phishshield.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.phishshield.dto.Dtos.AuthResponse;
import com.phishshield.dto.Dtos.UserDto;
import com.phishshield.exception.ApiException;
import com.phishshield.model.AppUser;
import com.phishshield.model.AuthSession;
import com.phishshield.repository.SessionRepository;
import com.phishshield.repository.UserRepository;
import com.phishshield.util.PasswordHasher;

@Service
public class AuthService {
    private static final int MAX_FAILED_LOGINS = 5;
    private static final Duration FAIL_WINDOW = Duration.ofMinutes(10);
    // A valid hash used to keep timing similar when the email does not exist.
    private static final String DUMMY_HASH = PasswordHasher.hash("not-a-real-password");

    private final UserRepository users;
    private final SessionRepository sessions;
    private final Duration sessionLength;
    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();

    public AuthService(UserRepository users, SessionRepository sessions,
                       @Value("${phishshield.auth.session-days:7}") long sessionDays) {
        this.users = users;
        this.sessions = sessions;
        this.sessionLength = Duration.ofDays(sessionDays);
    }

    @Transactional
    public AuthResponse register(String name, String email, String password) {
        String normalised = normalise(email);
        if (users.existsByEmail(normalised)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists. Try signing in.");
        }
        AppUser user = createUser(name.strip(), normalised, password);
        return openSession(user);
    }

    @Transactional
    public AuthResponse login(String email, String password) {
        String normalised = normalise(email);
        checkNotLocked(normalised);
        AppUser user = users.findByEmail(normalised).orElse(null);
        boolean ok = PasswordHasher.verify(password, user == null ? DUMMY_HASH : user.getPasswordHash());
        if (user == null || !ok) {
            recordFailure(normalised);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Incorrect email or password.");
        }
        failures.remove(normalised);
        sessions.deleteByExpiresAtBefore(Instant.now());
        return openSession(user);
    }

    @Transactional(readOnly = true)
    public AppUser authenticate(String token) {
        if (token == null || token.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in to continue.");
        }
        AuthSession session = sessions.findByTokenHash(PasswordHasher.sha256Hex(token))
                .filter(s -> s.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Your session has expired. Please sign in again."));
        return users.findById(session.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in to continue."));
    }

    @Transactional
    public void logout(String token) {
        if (token != null && !token.isBlank()) {
            sessions.deleteByTokenHash(PasswordHasher.sha256Hex(token));
        }
    }

    @Transactional
    public AppUser createUser(String name, String email, String password) {
        AppUser user = new AppUser();
        user.setName(name);
        user.setEmail(normalise(email));
        user.setPasswordHash(PasswordHasher.hash(password));
        user.setCreatedAt(Instant.now());
        return users.save(user);
    }

    public static UserDto toDto(AppUser u) {
        return new UserDto(u.getId(), u.getName(), u.getEmail());
    }

    // ---------------------------------------------------------------

    private AuthResponse openSession(AppUser user) {
        String token = PasswordHasher.randomToken();
        AuthSession s = new AuthSession();
        s.setTokenHash(PasswordHasher.sha256Hex(token));
        s.setUserId(user.getId());
        s.setExpiresAt(Instant.now().plus(sessionLength));
        sessions.save(s);
        return new AuthResponse(token, toDto(user), s.getExpiresAt());
    }

    private static String normalise(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private void checkNotLocked(String email) {
        Deque<Instant> q = failures.get(email);
        if (q == null) return;
        synchronized (q) {
            Instant cutoff = Instant.now().minus(FAIL_WINDOW);
            while (!q.isEmpty() && q.peekFirst().isBefore(cutoff)) q.pollFirst();
            if (q.size() >= MAX_FAILED_LOGINS) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                        "Too many failed sign-in attempts. Please wait a few minutes and try again.");
            }
        }
    }

    private void recordFailure(String email) {
        Deque<Instant> q = failures.computeIfAbsent(email, k -> new ArrayDeque<>());
        synchronized (q) {
            q.addLast(Instant.now());
        }
    }
}
