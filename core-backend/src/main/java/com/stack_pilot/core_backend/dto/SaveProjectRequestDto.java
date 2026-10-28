package com.stack_pilot.core_backend.dto;

import jakarta.validation.constraints.NotBlank;
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
public class SaveProjectRequestDto {
    @NotBlank(message = "Project name cannot be empty")
    private String name;

    private String description;

    @NotEmpty(message = "Components cannot be empty")
    private List<String> components;
}
