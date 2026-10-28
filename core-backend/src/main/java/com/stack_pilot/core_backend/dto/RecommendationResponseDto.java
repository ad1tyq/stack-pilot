package com.stack_pilot.core_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationResponseDto {

    private List<String> selected;
    private List<RecommendationItemDto> recommendations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendationItemDto {
        private String component;
        private Double score;
        private Double confidence;
        private String rationale;

        @JsonProperty("engine_source")
        private String engineSource;
    }
}
