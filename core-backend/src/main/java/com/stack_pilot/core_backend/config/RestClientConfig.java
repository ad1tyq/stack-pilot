package com.stack_pilot.core_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Value("${ml.engine.base-url:http://127.0.0.1:8000}")
    private String mlBaseUrl;

    @Bean
    public RestClient mlClient() {
        return RestClient.builder()
                .baseUrl(mlBaseUrl)
                .build();
    }
}
