package com.phishshield.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/** PBKDF2-HMAC-SHA256 password hashing using only the JDK. */
public final class PasswordHasher {
    private static final int ITERATIONS = 120_000;
    private static final int KEY_BITS = 256;
    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordHasher() {
    }

    public static String hash(String password) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        byte[] hash = pbkdf2(password.toCharArray(), salt, ITERATIONS);
        return ITERATIONS + ":" + Base64.getEncoder().encodeToString(salt) + ":" + Base64.getEncoder().encodeToString(hash);
    }

    public static boolean verify(String password, String stored) {
        try {
            String[] parts = stored.split(":");
            int iterations = Integer.parseInt(parts[0]);
            byte[] salt = Base64.getDecoder().decode(parts[1]);
            byte[] expected = Base64.getDecoder().decode(parts[2]);
            byte[] actual = pbkdf2(password.toCharArray(), salt, iterations);
            return MessageDigest.isEqual(expected, actual);
        } catch (RuntimeException e) {
            return false;
        }
    }

    public static String sha256Hex(String value) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : d) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static String randomToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static byte[] pbkdf2(char[] password, byte[] salt, int iterations) {
        try {
            SecretKeyFactory f = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            return f.generateSecret(new PBEKeySpec(password, salt, iterations, KEY_BITS)).getEncoded();
        } catch (Exception e) {
            throw new IllegalStateException("Password hashing is not available", e);
        }
    }
}
