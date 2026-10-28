import axios from 'axios';
import type { RecommendationResponse, ScaffoldResponse, ArchitectureProject, SaveProjectRequest } from '../types';

const API = axios.create({
  baseURL: 'http://localhost:8080/api/v1/architecture'
});

export const fetchRecommendations = async (
  components: string[],
  maxRecommendations: number = 4
): Promise<RecommendationResponse> => {
  const { data } = await API.post<RecommendationResponse>('/recommend', {
    selected_components: components,
    max_recommendations: maxRecommendations
  });
  return data;
};

export const fetchScaffolding = async (components: string[]): Promise<ScaffoldResponse> => {
  const { data } = await API.post<ScaffoldResponse>('/scaffold', components);
  return data;
};

export const saveProject = async (project: SaveProjectRequest): Promise<ArchitectureProject> => {
  const { data } = await API.post<ArchitectureProject>('/save', project);
  return data;
};

export const fetchProjects = async (): Promise<ArchitectureProject[]> => {
  const { data } = await API.get<ArchitectureProject[]>('/projects');
  return data;
};
