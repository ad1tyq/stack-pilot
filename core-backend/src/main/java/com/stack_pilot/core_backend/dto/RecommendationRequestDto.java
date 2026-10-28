package com.stack_pilot.core_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationRequestDto {

    @NotEmpty(message = "Selected components cannot be empty")
    @JsonProperty("selected_components")
    private List<String> selectedComponents;

    @JsonProperty("max_recommendations")
    @Builder.Default
    private Integer maxRecommendations = 5;
}
