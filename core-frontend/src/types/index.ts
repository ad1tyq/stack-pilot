export interface RecommendationItem {
  component: string;
  score: number;
  confidence: number;
  rationale: string;
  engineSource?: string;
  engine_source?: string;
}

export interface RecommendationResponse {
  selected: string[];
  recommendations: RecommendationItem[];
}

export interface ScaffoldResponse {
  dockerComposeYaml: string;
  envExample: string;
}

export interface ArchitectureProject {
  id: string;
  name: string;
  description?: string;
  components: string[];
  generatedDockerCompose?: string;
  generatedEnvExample?: string;
  createdAt?: string;
}

export interface SaveProjectRequest {
  name: string;
  description?: string;
  components: string[];
}
