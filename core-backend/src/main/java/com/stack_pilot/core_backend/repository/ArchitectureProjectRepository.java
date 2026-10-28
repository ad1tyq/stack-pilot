package com.stack_pilot.core_backend.repository;

import com.stack_pilot.core_backend.entity.ArchitectureProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ArchitectureProjectRepository extends JpaRepository<ArchitectureProject, UUID> {
}
