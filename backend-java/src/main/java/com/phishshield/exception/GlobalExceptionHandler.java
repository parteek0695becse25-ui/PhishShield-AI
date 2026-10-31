package com.phishshield.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> api(ApiException ex) {
        return body(ex.getStatus(), ex.getMessage(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
        String first = fields.values().stream().findFirst().orElse("The request is not valid.");
        return body(HttpStatus.BAD_REQUEST, first, fields);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> unreadable(HttpMessageNotReadableException ex) {
        return body(HttpStatus.BAD_REQUEST, "The request body is missing or is not valid JSON.", null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> typeMismatch(MethodArgumentTypeMismatchException ex) {
        return body(HttpStatus.BAD_REQUEST, "Parameter '" + ex.getName() + "' has an invalid value.", null);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> method(HttpRequestMethodNotSupportedException ex) {
        return body(HttpStatus.METHOD_NOT_ALLOWED, "This HTTP method is not supported here.", null);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> notFound(NoResourceFoundException ex) {
        return body(HttpStatus.NOT_FOUND, "That endpoint does not exist.", null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> other(Exception ex) {
        log.error("Unexpected error", ex);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong on the server. Check logs/backend.log.", null);
    }

    private ResponseEntity<Map<String, Object>> body(HttpStatus status, String message, Map<String, String> fields) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("timestamp", Instant.now().toString());
        m.put("status", status.value());
        m.put("error", status.getReasonPhrase());
        m.put("message", message);
        if (fields != null && !fields.isEmpty()) {
            m.put("fieldErrors", fields);
        }
        return ResponseEntity.status(status).body(m);
    }
}
