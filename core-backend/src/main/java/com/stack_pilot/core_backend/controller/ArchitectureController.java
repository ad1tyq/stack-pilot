package com.stack_pilot.core_backend.controller;

import com.stack_pilot.core_backend.dto.*;
import com.stack_pilot.core_backend.entity.ArchitectureProject;
import com.stack_pilot.core_backend.repository.ArchitectureProjectRepository;
import com.stack_pilot.core_backend.service.ScaffoldingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/architecture")
@RequiredArgsConstructor
public class ArchitectureController {

    private final RestClient mlClient;
    private final ScaffoldingService scaffoldingService;
    private final ArchitectureProjectRepository projectRepository;

    @PostMapping("/recommend")
    public ResponseEntity<?> getRecommendations(@Valid @RequestBody RecommendationRequestDto request) {
        log.info("Fetching recommendations for components: {}", request.getSelectedComponents());
        try {
            RecommendationResponseDto response = mlClient.post()
                    .uri("/predict")
                    .body(request)
                    .retrieve()
                    .body(RecommendationResponseDto.class);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to connect or retrieve prediction from ML engine: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("ML Inference Engine unavailable: " + e.getMessage());
        }
    }

    @PostMapping("/scaffold")
    public ResponseEntity<ScaffoldResponseDto> scaffold(@RequestBody List<String> components) {
        String compose = scaffoldingService.generateDockerCompose(components);
        String env = scaffoldingService.generateEnvExample(components);
        return ResponseEntity.ok(new ScaffoldResponseDto(compose, env));
    }

    @PostMapping("/save")
    public ResponseEntity<ArchitectureProject> saveProject(@Valid @RequestBody SaveProjectRequestDto request) {
        String compose = scaffoldingService.generateDockerCompose(request.getComponents());
        String env = scaffoldingService.generateEnvExample(request.getComponents());

        ArchitectureProject project = ArchitectureProject.builder()
                .name(request.getName())
                .description(request.getDescription())
                .components(request.getComponents())
                .generatedDockerCompose(compose)
                .generatedEnvExample(env)
                .build();

        ArchitectureProject saved = projectRepository.save(project);
        log.info("Successfully saved project {} with ID: {}", saved.getName(), saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/projects")
    public ResponseEntity<List<ArchitectureProject>> getAllProjects() {
        return ResponseEntity.ok(projectRepository.findAll());
    }

    @GetMapping("/projects/{id}")
    public ResponseEntity<?> getProjectById(@PathVariable UUID id) {
        return projectRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found: " + id));
    }

    @DeleteMapping("/projects/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id) {
        if (projectRepository.existsById(id)) {
            projectRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
