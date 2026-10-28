package com.stack_pilot.core_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "architecture_projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchitectureProject {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "project_components", joinColumns = @JoinColumn(name = "project_id"))
    @Column(name = "component_name")
    private List<String> components;

    @Column(columnDefinition = "TEXT")
    private String generatedDockerCompose;

    @Column(columnDefinition = "TEXT")
    private String generatedEnvExample;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
