package com.phishshield.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.phishshield.repository.UserRepository;
import com.phishshield.service.AuthService;

/** Creates a local demo account on first start so the app can be tried straight away. */
@Component
public class DemoUserSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoUserSeeder.class);

    private final UserRepository users;
    private final AuthService auth;
    private final boolean enabled;
    private final String email;
    private final String password;

    public DemoUserSeeder(UserRepository users, AuthService auth,
                          @Value("${phishshield.demo-user.enabled:true}") boolean enabled,
                          @Value("${phishshield.demo-user.email}") String email,
                          @Value("${phishshield.demo-user.password}") String password) {
        this.users = users;
        this.auth = auth;
        this.enabled = enabled;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (enabled && !users.existsByEmail(email)) {
            auth.createUser("Demo User", email, password);
            log.info("Created demo account {}", email);
        }
    }
}
