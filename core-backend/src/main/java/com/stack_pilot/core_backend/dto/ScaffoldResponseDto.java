package com.stack_pilot.core_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScaffoldResponseDto {
    private String dockerComposeYaml;
    private String envExample;
}
