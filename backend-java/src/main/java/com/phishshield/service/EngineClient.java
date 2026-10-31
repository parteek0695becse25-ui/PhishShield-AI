package com.phishshield.service;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.phishshield.dto.Dtos.EngineResult;
import com.phishshield.exception.ApiException;

/** Talks to the Python FastAPI detection engine over HTTP. */
@Component
public class EngineClient {
    private final RestClient client;
    private final ObjectMapper mapper;

    public EngineClient(@Value("${phishshield.engine.url}") String baseUrl, ObjectMapper mapper) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
        this.mapper = mapper;
    }

    public EngineResult analyzeMessage(String text) {
        return post("/analyze/message", Map.of("text", text));
    }

    public EngineResult analyzeUrl(String url) {
        return post("/analyze/url", Map.of("url", url));
    }

    /** True when the engine's /health endpoint answers. */
    public boolean isHealthy() {
        try {
            Map<?, ?> body = client.get().uri("/health").retrieve().body(Map.class);
            return body != null && "UP".equals(body.get("status"));
        } catch (RuntimeException e) {
            return false;
        }
    }

    private EngineResult post(String path, Object body) {
        try {
            EngineResult result = client.post().uri(path).contentType(MediaType.APPLICATION_JSON).body(body)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError(), (req, res) -> {
                        throw new ApiException(HttpStatus.BAD_REQUEST, extractDetail(res.getBody()));
                    })
                    .body(EngineResult.class);
            if (result == null || result.riskScore() == null || result.riskLevel() == null) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "The detection engine returned an unexpected answer.");
            }
            return result;
        } catch (ApiException e) {
            throw e;
        } catch (ResourceAccessException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The detection engine is not reachable. Run start.bat again and check logs/engine.log.");
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "The detection engine failed to analyse this input. Check logs/engine.log.");
        }
    }

    private String extractDetail(java.io.InputStream in) {
        String fallback = "The detection engine did not accept this input.";
        try {
            JsonNode detail = mapper.readTree(in).get("detail");
            if (detail != null && detail.isTextual()) {
                return detail.asText();
            }
        } catch (Exception ignored) {
            // fall through to the generic message
        }
        return fallback;
    }
}
